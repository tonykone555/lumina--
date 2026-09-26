import json
import shutil
from pathlib import Path

import modal
from fastapi import HTTPException

APP_NAME="ynot-room-high-detail"
VOLUME_PATH=Path("/ynot-room")
MODEL_PATH=Path("/models-high-detail")
MODEL_ID="Ruicheng/moge-2-vitl-normal"
QA_URL="https://tonykone555--ynot-room-qa-room-qa.modal.run"

image=(
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("git","libgl1","libglib2.0-0")
    .uv_pip_install("fastapi[standard]","pillow","numpy","trimesh","opencv-python-headless","torch","torchvision","huggingface_hub","requests","git+https://github.com/microsoft/MoGe.git")
    .env({"HF_HOME":str(MODEL_PATH)})
)
app=modal.App(APP_NAME)
volume=modal.Volume.from_name("ynot-room-jobs",create_if_missing=True)
model_cache=modal.Volume.from_name("ynot-room-high-detail-model-cache",create_if_missing=True)


def _safe_id(value:str)->str:
    return "".join(ch for ch in str(value) if ch.isalnum() or ch in "-_")[:80]


def _job_dir(job_id:str)->Path:return VOLUME_PATH/"jobs"/job_id

def _write(path:Path,payload:dict):path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(payload,indent=2),encoding="utf-8")

def _load_rgb(path:Path,max_edge=1280):
    import numpy as np
    from PIL import Image,ImageOps
    with Image.open(path) as src:
        img=ImageOps.exif_transpose(src).convert("RGB")
        if max(img.size)>max_edge:
            scale=max_edge/max(img.size);img=img.resize((max(1,round(img.width*scale)),max(1,round(img.height*scale))),Image.Resampling.LANCZOS)
        return np.asarray(img)


def _pixel_k(normalized,width,height):
    import numpy as np
    k=np.asarray(normalized,dtype=np.float64).copy();k[0,0]*=width;k[1,1]*=height;k[0,2]*=width;k[1,2]*=height;return k


def _features(image):
    import cv2
    gray=cv2.cvtColor(image,cv2.COLOR_RGB2GRAY)
    detector=cv2.SIFT_create(nfeatures=8000,contrastThreshold=.018)
    return detector.detectAndCompute(gray,None)


def _good_matches(a,b):
    import cv2
    kp1,d1=a;kp2,d2=b
    if d1 is None or d2 is None:return kp1,kp2,[]
    pairs=cv2.BFMatcher(cv2.NORM_L2).knnMatch(d1,d2,k=2)
    good=[m for pair in pairs if len(pair)==2 for m,n in [pair] if m.distance<.78*n.distance]
    return kp1,kp2,good


def _choose_seed(views):
    features=[_features(v["image"]) for v in views]
    scores=[0]*len(views)
    for i in range(len(views)):
        for j in range(i+1,len(views)):
            _a,_b,matches=_good_matches(features[i],features[j]);count=min(len(matches),500);scores[i]+=count;scores[j]+=count
    return max(range(len(views)),key=lambda i:scores[i]),features,scores


def _align(seed,target,seed_features,target_features):
    import cv2
    import numpy as np
    seed_kp,target_kp,good=_good_matches(seed_features,target_features)
    if len(good)<14:return None,{"reason":"not_enough_matches","matches":len(good)}
    sh,sw=seed["mask"].shape;th,tw=target["mask"].shape
    object_points=[];image_points=[];target_metric=[]
    for match in good:
        sx,sy=seed_kp[match.queryIdx].pt;tx,ty=target_kp[match.trainIdx].pt
        sxi,syi=int(round(sx)),int(round(sy));txi,tyi=int(round(tx)),int(round(ty))
        if not(0<=sxi<sw and 0<=syi<sh and 0<=txi<tw and 0<=tyi<th) or not seed["mask"][syi,sxi]:continue
        p=seed["points"][syi,sxi]
        if not np.isfinite(p).all() or p[2]<=0:continue
        object_points.append(p);image_points.append((tx,ty))
        q=target["points"][tyi,txi] if target["mask"][tyi,txi] else np.array([np.nan]*3)
        target_metric.append(q)
    if len(object_points)<12:return None,{"reason":"not_enough_metric_matches","matches":len(object_points)}
    obj=np.asarray(object_points,dtype=np.float64);img=np.asarray(image_points,dtype=np.float64);target_metric=np.asarray(target_metric,dtype=np.float64);k=_pixel_k(target["intrinsics"],tw,th)
    ok,rvec,tvec,inliers=cv2.solvePnPRansac(obj,img,k,None,iterationsCount=800,reprojectionError=6.0,confidence=.999,flags=cv2.SOLVEPNP_EPNP)
    if not ok or inliers is None or len(inliers)<9:return None,{"reason":"pnp_failed","matches":len(obj),"inliers":0 if inliers is None else len(inliers)}
    idx=inliers.reshape(-1);cv2.solvePnP(obj[idx],img[idx],k,None,rvec,tvec,True,flags=cv2.SOLVEPNP_ITERATIVE);rotation,_=cv2.Rodrigues(rvec);translation=tvec.reshape(3)
    ratio=len(idx)/max(1,len(obj));baseline=float(np.linalg.norm(translation))
    if ratio<.18 or baseline>18:return None,{"reason":"pose_quality_rejected","matches":len(obj),"inliers":len(idx),"inlierRatio":round(ratio,4),"baseline":round(baseline,4)}
    predicted=(rotation@obj[idx].T).T+translation.reshape(1,3);observed=target_metric[idx]
    valid=np.isfinite(observed).all(axis=1)&(observed[:,2]>.05)&(predicted[:,2]>.05);ratios=predicted[valid,2]/observed[valid,2];ratios=ratios[np.isfinite(ratios)&(ratios>.3)&(ratios<3.2)]
    scale=float(np.clip(np.median(ratios),.5,2.0)) if len(ratios)>=5 else 1.0
    return {"rotation":rotation,"translation":translation,"scale":scale},{"matches":len(obj),"inliers":len(idx),"inlierRatio":round(ratio,4),"baseline":round(baseline,4),"scale":round(scale,5),"rotation":rotation.round(6).tolist(),"translation":translation.round(6).tolist(),"intrinsics":target["intrinsics"].tolist()}


def _mesh(view):
    import numpy as np
    points=view["points"];mask=view["mask"];image=view["image"];h,w=mask.shape;stride=max(1,int(max(h,w)/480))
    pts=points[::stride,::stride].astype(np.float32);valid=mask[::stride,::stride].astype(bool)&np.isfinite(pts).all(axis=-1)&(pts[...,2]>0);img=image[::stride,::stride]
    hh,ww=valid.shape;index=np.full((hh,ww),-1,dtype=np.int32);index[valid]=np.arange(int(valid.sum()))
    vertices=pts[valid].astype(np.float64)*float(view.get("scale",1.0))
    if view.get("rotation") is not None:
        vertices=(vertices-np.asarray(view["translation"]).reshape(1,3))@np.asarray(view["rotation"])
    vertices=vertices.astype(np.float32);colors=np.concatenate([img[valid].astype(np.uint8),np.full((int(valid.sum()),1),255,dtype=np.uint8)],axis=1);faces=[];depth=pts[...,2]
    for y in range(hh-1):
        for x in range(ww-1):
            cell=[(y,x),(y,x+1),(y+1,x),(y+1,x+1)]
            if not all(valid[yy,xx] for yy,xx in cell):continue
            ds=np.array([depth[yy,xx] for yy,xx in cell]);mean=float(ds.mean())
            if mean<=0 or float(ds.max()-ds.min())/mean>.08:continue
            a,b,c,d=int(index[y,x]),int(index[y,x+1]),int(index[y+1,x]),int(index[y+1,x+1]);faces.extend([(a,c,b),(b,c,d)])
    return vertices,np.asarray(faces,dtype=np.int32),colors,stride


def _export(views,path):
    import numpy as np
    import trimesh
    verts=[];faces=[];colors=[];offset=0;strides=[]
    for view in views:
        v,f,c,s=_mesh(view)
        if len(v)<300 or len(f)<300:continue
        verts.append(v);faces.append(f+offset);colors.append(c);offset+=len(v);strides.append(s)
    if not verts:raise RuntimeError("High-detail reconstruction produced no usable geometry")
    vertices=np.concatenate(verts);face_arr=np.concatenate(faces);color_arr=np.concatenate(colors);vertices*=np.array([1,-1,-1],dtype=np.float32)
    mesh=trimesh.Trimesh(vertices=vertices,faces=face_arr,vertex_colors=color_arr,process=False);center=mesh.bounds.mean(axis=0);mesh.apply_translation(-center);path.parent.mkdir(parents=True,exist_ok=True);mesh.export(path,file_type="glb")
    return {"vertices":len(vertices),"faces":len(face_arr),"views":len(verts),"strides":strides,"bytes":path.stat().st_size,"centerOffset":center.round(6).tolist()}


def _run(job_id):
    import numpy as np
    import requests
    import torch
    from PIL import Image,ImageOps
    from moge.model import import_model_class_by_version

    volume.reload();job=_job_dir(job_id);photo_dir=job/"photos";manifest_path=job/"manifest.json";scene_path=job/"scene.glb"
    if not photo_dir.exists():raise FileNotFoundError("Original room photos are unavailable")
    photos=sorted(p for p in photo_dir.iterdir() if p.is_file())
    if len(photos)<3:raise RuntimeError("High-detail reconstruction requires at least 3 photos")
    original_manifest=json.loads(manifest_path.read_text()) if manifest_path.exists() else {};metadata=original_manifest.get("input") or {"requestId":job_id,"photos":[p.name for p in photos]}
    repair_dir=job/"repair";repair_dir.mkdir(parents=True,exist_ok=True)
    if scene_path.exists() and not (repair_dir/"scene-fast-pass.glb").exists():shutil.copy2(scene_path,repair_dir/"scene-fast-pass.glb")
    if manifest_path.exists() and not (repair_dir/"manifest-fast-pass.json").exists():shutil.copy2(manifest_path,repair_dir/"manifest-fast-pass.json")
    _write(job/"status.json",{"id":job_id,"status":"processing","stage":"high_detail_reconstruction","message":"YNOT Room is running the high-detail reconstruction fallback."});volume.commit()

    model=import_model_class_by_version("v2").from_pretrained(MODEL_ID).cuda().eval();views=[];inspection=[]
    for i,path in enumerate(photos):
        with Image.open(path) as src:
            img=ImageOps.exif_transpose(src);inspection.append({"name":path.name,"width":img.width,"height":img.height,"mode":img.mode,"format":src.format})
        image_np=_load_rgb(path);tensor=torch.tensor(image_np,dtype=torch.float16,device="cuda").permute(2,0,1)/255
        with torch.inference_mode():out=model.infer(tensor,resolution_level=9,use_fp16=True,apply_mask=True)
        views.append({"name":path.name,"image":image_np,"points":out["points"].float().cpu().numpy(),"mask":out["mask"].cpu().numpy().astype(bool),"intrinsics":out["intrinsics"].float().cpu().numpy()})

    seed_index,features,connectivity=_choose_seed(views);seed=views[seed_index];seed.update({"rotation":None,"translation":None,"scale":1.0});fused=[seed];align=[]
    for i,target in enumerate(views):
        if i==seed_index:
            align.append({"view":target["name"],"seed":True,"used":True,"intrinsics":target["intrinsics"].tolist(),"connectivityScore":connectivity[i]});continue
        pose,quality=_align(seed,target,features[seed_index],features[i]);record={"view":target["name"],"seed":False,"connectivityScore":connectivity[i],**quality}
        if pose is None:record["used"]=False;align.append(record);continue
        target.update(pose);fused.append(target);record["used"]=True;align.append(record)

    mesh=_export(fused,scene_path);manifest={"version":4,"id":job_id,"input":metadata,"photos":inspection,"compute":{"provider":"modal","gpu":"A10G","profile":"high_detail"},"reconstruction":{"model":MODEL_ID,"method":"moge2_vitl_high_detail_multiview","sourceView":seed["name"],"seedIntrinsics":seed["intrinsics"].tolist(),"fusedViewCount":len(fused),"seedConnectivityScores":connectivity,"alignment":align,"mesh":mesh},"pipeline":{"metricReconstruction":"complete","multiViewAlignment":"complete" if len(fused)>1 else "fallback_monocular","glbExport":"complete","qa":"refreshing"}}
    _write(manifest_path,manifest);volume.commit()
    qa=requests.get(QA_URL,params={"id":job_id,"refresh":"true"},timeout=240);qa.raise_for_status();qa_data=qa.json()
    result={"id":job_id,"status":"ready","stage":"scene_ready","message":"High-detail room reconstruction completed.","photoCount":len(photos),"fusedViewCount":len(fused),"reconstruction":"moge2_vitl_high_detail_multiview","mesh":mesh,"qa":qa_data,"releaseStatus":qa_data.get("releaseStatus","review_required")}
    _write(job/"status.json",{**result,"sceneUrl":f"https://tonykone555--ynot-room-room-scene.modal.run?id={job_id}"});volume.commit();return result


@app.function(image=image,gpu="A10G",memory=24576,timeout=1800,scaledown_window=600,volumes={str(VOLUME_PATH):volume,str(MODEL_PATH):model_cache})
@modal.fastapi_endpoint(method="POST")
def high_detail_reconstruct(id:str):
    safe=_safe_id(id)
    if not safe:raise HTTPException(status_code=400,detail="Missing room id")
    try:return _run(safe)
    except FileNotFoundError as exc:raise HTTPException(status_code=409,detail=str(exc)) from exc
    except Exception as exc:raise HTTPException(status_code=500,detail=f"High-detail reconstruction failed: {str(exc)[:800]}") from exc
