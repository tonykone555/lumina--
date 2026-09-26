import json
from pathlib import Path

import modal
from fastapi import HTTPException

APP_NAME="ynot-room-repair"
VOLUME_PATH=Path("/ynot-room")
MAX_POINTS=45000
MAX_ATTEMPTS=2

image=(
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("libgl1","libglib2.0-0")
    .uv_pip_install("fastapi[standard]","numpy","pillow","opencv-python-headless","trimesh")
)
app=modal.App(APP_NAME,image=image)
volume=modal.Volume.from_name("ynot-room-jobs",create_if_missing=True)


def _safe_id(value:str)->str:
    return "".join(ch for ch in str(value) if ch.isalnum() or ch in "-_")[:80]


def _job_dir(job_id:str)->Path:
    return VOLUME_PATH/"jobs"/job_id


def _read(path:Path):
    return json.loads(path.read_text(encoding="utf-8"))


def _write(path:Path,payload:dict):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(payload,indent=2),encoding="utf-8")


def _load_points(scene_path:Path):
    import numpy as np
    import trimesh
    loaded=trimesh.load(scene_path,force="scene",process=False)
    chunks=[]
    if isinstance(loaded,trimesh.Scene):
        for node in loaded.graph.nodes_geometry:
            transform,name=loaded.graph[node]
            geometry=loaded.geometry.get(name)
            if geometry is not None and len(geometry.vertices):
                chunks.append(trimesh.transform_points(geometry.vertices,transform))
    if not chunks:
        raise RuntimeError("No scene geometry available for repair")
    points=np.concatenate(chunks,axis=0).astype(np.float64)
    points=points[np.isfinite(points).all(axis=1)]
    if len(points)>MAX_POINTS:
        rng=np.random.default_rng(77)
        points=points[rng.choice(len(points),MAX_POINTS,replace=False)]
    return points


def _project_mask(points,center,rotation,translation,intrinsics,width,height,focal_scale=1.0):
    import numpy as np
    flip=np.array([1.0,-1.0,-1.0])
    seed=(points+np.asarray(center).reshape(1,3))*flip.reshape(1,3)
    r=np.asarray(rotation,dtype=np.float64).reshape(3,3)
    t=np.asarray(translation,dtype=np.float64).reshape(1,3)
    cam=seed@r.T+t
    z=cam[:,2]
    valid=np.isfinite(cam).all(axis=1)&(z>0.08)
    cam,z=cam[valid],z[valid]
    if not len(cam):return None
    k=np.asarray(intrinsics,dtype=np.float64)
    u=(float(k[0,0])*focal_scale)*width*cam[:,0]/z+float(k[0,2])*width
    v=(float(k[1,1])*focal_scale)*height*cam[:,1]/z+float(k[1,2])*height
    inside=(u>=0)&(u<width)&(v>=0)&(v<height)
    if inside.sum()<50:return None
    x=np.clip(np.rint(u[inside]).astype(int),0,width-1)
    y=np.clip(np.rint(v[inside]).astype(int),0,height-1)
    mask=np.zeros((height,width),dtype=np.uint8)
    mask[y,x]=255
    return mask


def _camera_score(source_rgb,mask):
    import cv2
    import numpy as np
    if mask is None:return 0.0
    kernel=np.ones((5,5),dtype=np.uint8)
    mask=cv2.dilate(mask,kernel,iterations=2)
    coverage=float((mask>0).mean())
    if coverage<0.08:return coverage
    source_gray=cv2.cvtColor(source_rgb,cv2.COLOR_RGB2GRAY)
    edges=cv2.Canny(source_gray,55,145)
    edge_pixels=edges>0
    if not edge_pixels.any():return coverage
    edge_coverage=float((edge_pixels&(mask>0)).sum()/max(1,edge_pixels.sum()))
    return 0.55*min(1.0,coverage/0.55)+0.45*edge_coverage


def _refine_camera(points,source_rgb,center,camera,intrinsics):
    import numpy as np
    height,width=source_rgb.shape[:2]
    rotation=camera.get("rotation") or [[1,0,0],[0,1,0],[0,0,1]]
    base=np.asarray(camera.get("translation") or [0,0,0],dtype=np.float64)
    baseline=float(np.linalg.norm(base))
    step=max(0.06,min(0.28,baseline*0.06 if baseline>0 else 0.14))
    candidates=[]
    for dx in (-step,0.0,step):
        for dy in (-step,0.0,step):
            for dz in (-step,0.0,step):
                for focal in (0.94,1.0,1.06):
                    t=base+np.array([dx,dy,dz])
                    mask=_project_mask(points,center,rotation,t,intrinsics,width,height,focal)
                    candidates.append((_camera_score(source_rgb,mask),t,focal))
    candidates.sort(key=lambda item:item[0],reverse=True)
    score,t,focal=candidates[0]
    original=_camera_score(source_rgb,_project_mask(points,center,rotation,base,intrinsics,width,height,1.0))
    improved=score>original+0.015
    return {
        "improved":bool(improved),
        "beforeScore":round(float(original),4),
        "afterScore":round(float(score),4),
        "translation":t.round(6).tolist() if improved else base.round(6).tolist(),
        "focalScale":round(float(focal if improved else 1.0),4),
    }


def _repair(job_id:str):
    import numpy as np
    from PIL import Image,ImageOps

    job_dir=_job_dir(job_id)
    qa_path=job_dir/"qa"/"qa.json"
    manifest_path=job_dir/"manifest.json"
    scene_path=job_dir/"scene.glb"
    if not qa_path.exists() or not manifest_path.exists() or not scene_path.exists():
        raise FileNotFoundError("Room QA and reconstruction must exist before repair")
    qa=_read(qa_path)
    if qa.get("canPublish"):
        return {"id":job_id,"status":"no_repair_needed","canPublish":True,"releaseStatus":"publishable"}

    state_path=job_dir/"qa"/"repair-state.json"
    state=_read(state_path) if state_path.exists() else {"attempts":0,"history":[]}
    if int(state.get("attempts",0))>=MAX_ATTEMPTS:
        return {"id":job_id,"status":"repair_limit_reached","attempts":state.get("attempts",0),"nextAction":"manual_review_or_reconstruction","releaseStatus":"review_required"}

    blockers=qa.get("blockers") or []
    codes={str(item.get("code")) for item in blockers if isinstance(item,dict)}
    geometry_codes={"large_uncovered_region","reference_missing"}
    unmatched_codes={"camera_not_aligned"}
    camera_codes={"weak_structure_match","low_view_similarity"}
    if codes&geometry_codes:
        action="reconstruction_retry_required"
        record={"attempt":int(state.get("attempts",0))+1,"action":action,"reason":sorted(codes&geometry_codes)}
        state["attempts"]=record["attempt"]
        state.setdefault("history",[]).append(record)
        _write(state_path,state);volume.commit()
        return {"id":job_id,"status":"escalated","repair":record,"nextAction":"reconstruct_high_detail","releaseStatus":"review_required"}

    manifest=_read(manifest_path)
    reconstruction=manifest.get("reconstruction") or {}
    alignments=reconstruction.get("alignment") or []
    by_view={item.get("view"):item for item in alignments if item.get("view")}
    seed_name=reconstruction.get("sourceView")
    seed_intrinsics=reconstruction.get("seedIntrinsics")
    center=(qa.get("cameraOrigin") or {}).get("centerOffset")
    if seed_intrinsics is None or center is None:
        raise RuntimeError("QA repair is missing camera origin metadata")
    points=_load_points(scene_path)
    reports=qa.get("viewReports") or []
    overrides={}
    improvements=[]
    photo_dir=job_dir/"photos"

    for report in reports:
        if not isinstance(report,dict) or not report.get("matched"):
            continue
        view=str(report.get("view") or "")
        report_codes=set(report.get("blockers") or [])
        if not report_codes&camera_codes:
            continue
        camera=by_view.get(view,{})
        if view==seed_name:
            camera={**camera,"rotation":[[1,0,0],[0,1,0],[0,0,1]],"translation":[0,0,0],"used":True}
        source_path=photo_dir/view
        if not source_path.exists():continue
        with Image.open(source_path) as image:
            image=ImageOps.exif_transpose(image).convert("RGB")
            scale=min(1.0,260/max(image.size))
            image=image.resize((max(96,round(image.width*scale)),max(72,round(image.height*scale))),Image.Resampling.LANCZOS)
            source=np.asarray(image)
        intrinsics=camera.get("intrinsics") or seed_intrinsics
        result=_refine_camera(points,source,center,camera,intrinsics)
        if result["improved"]:
            overrides[view]={"translation":result["translation"],"focalScale":result["focalScale"]}
            improvements.append({"view":view,**result})

    if codes&unmatched_codes and not improvements:
        action="reconstruction_retry_required"
    elif improvements:
        action="camera_refinement"
    else:
        action="reconstruction_retry_required"

    attempt=int(state.get("attempts",0))+1
    repair={"attempt":attempt,"action":action,"improvements":improvements,"overrides":overrides}
    state["attempts"]=attempt
    state.setdefault("history",[]).append(repair)
    _write(job_dir/"qa"/"camera-overrides.json",{"version":1,"views":overrides})
    _write(state_path,state)
    volume.commit()
    return {
        "id":job_id,
        "status":"repaired" if improvements else "escalated",
        "repair":repair,
        "nextAction":"rerun_matched_camera_qa_with_overrides" if improvements else "reconstruct_high_detail",
        "releaseStatus":"review_required",
    }


@app.function(memory=4096,timeout=180,volumes={str(VOLUME_PATH):volume})
@modal.fastapi_endpoint(method="POST")
def room_repair(id:str):
    safe_id=_safe_id(id)
    if not safe_id:raise HTTPException(status_code=400,detail="Missing room id")
    volume.reload()
    try:return _repair(safe_id)
    except FileNotFoundError as exc:raise HTTPException(status_code=409,detail=str(exc)) from exc
    except Exception as exc:raise HTTPException(status_code=500,detail=f"Room repair failed: {str(exc)[:700]}") from exc
