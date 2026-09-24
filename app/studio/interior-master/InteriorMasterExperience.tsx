import {ArrowDown,ArrowRight,ArrowUpRight} from "lucide-react";
import ScrollTour from "./ScrollTour";
import styles from "./interior-master.module.css";

const STUDIO={
  name:"AURELIA",
  descriptor:"INTERIOR ARCHITECTURE",
  location:"LONDON · PARIS · MARBELLA",
  headline:"Spaces made to be felt.",
  intro:"Residential interiors shaped through light, material and movement.",
  email:"studio@aurelia.design",
};

const IMAGES={
  hero:"https://images.unsplash.com/photo-1758957701419-2c6e266f7988?auto=format&fit=crop&fm=jpg&q=82&w=2200",
  calm:"https://images.unsplash.com/photo-1771888703723-01d85da1dae1?auto=format&fit=crop&fm=jpg&q=82&w=1800",
  fireplace:"https://images.unsplash.com/photo-1771371428960-35a50c2d4e7c?auto=format&fit=crop&fm=jpg&q=82&w=1800",
  shelves:"https://images.unsplash.com/photo-1760072513442-9872656c1b07?auto=format&fit=crop&fm=jpg&q=82&w=1800",
  penthouse:"https://images.unsplash.com/photo-1776362355123-ca966d36e29c?auto=format&fit=crop&fm=jpg&q=82&w=1800",
  courtyard:"https://images.unsplash.com/photo-1758448756362-e323282ccbcc?auto=format&fit=crop&fm=jpg&q=82&w=1800",
};

const PROJECTS=[
  {image:IMAGES.hero,eyebrow:"PRIVATE RESIDENCE · 01",title:"Sculpted living",meta:"Material · Light · Art"},
  {image:IMAGES.calm,eyebrow:"PRIVATE RESIDENCE · 02",title:"Quiet composition",meta:"Texture · Oak · Restraint"},
  {image:IMAGES.penthouse,eyebrow:"PRIVATE RESIDENCE · 03",title:"Vertical light",meta:"Volume · Stone · Glow"},
  {image:IMAGES.shelves,eyebrow:"PRIVATE RESIDENCE · 04",title:"Soft geometry",meta:"Joinery · Warmth · Detail"},
  {image:IMAGES.fireplace,eyebrow:"PRIVATE RESIDENCE · 05",title:"Living frame",meta:"Flow · Framing · Rhythm"},
  {image:IMAGES.courtyard,eyebrow:"HOSPITALITY · 06",title:"Threshold garden",meta:"Stone · Water · Light"},
];

export default function InteriorMasterExperience(){
  return <main className={styles.interiorMaster}>
    <header className={styles.nav}>
      <a className={styles.wordmark} href="#top" aria-label="Back to top"><span data-personalize="company-name">{STUDIO.name}</span><small>{STUDIO.descriptor}</small></a>
      <div className={styles.navMeta} data-personalize="location">{STUDIO.location}</div>
      <nav className={styles.navLinks}><a href="#interior-scroll-tour">Experience</a><a href="#projects">Projects</a><a href="#studio">Studio</a><a href="#contact">Contact</a></nav>
      <a className={styles.menuButton} href="#projects" aria-label="View projects"><span/><span/></a>
    </header>

    <section className={styles.hero} id="top">
      <div className={styles.heroBackdrop} aria-hidden="true"><img src={IMAGES.hero} alt=""/></div><div className={styles.heroShade}/>
      <div className={styles.heroTopline}>RESIDENTIAL · HOSPITALITY · BESPOKE</div>
      <div className={styles.heroCopy}><p>INTERIORS / 2026</p><h1 data-personalize="hero-headline">{STUDIO.headline}</h1><div className={styles.heroBottom}><p data-personalize="hero-intro">{STUDIO.intro}</p><a href="#interior-scroll-tour"><span>Enter the space</span><ArrowDown/></a></div></div>
      <div className={styles.heroIndex}>01 — 05</div>
    </section>

    <section className={styles.manifesto} id="studio">
      <div className={styles.sectionKicker}>A / APPROACH</div>
      <p className={styles.manifestoLead}>We design interiors as <em>experiences</em> — composed through proportion, restraint and the way a room reveals itself in motion.</p>
      <div className={styles.manifestoGrid}><p>Every project begins with atmosphere. We reduce noise, amplify material and let light create the rhythm.</p><p>The result is not a style applied to a space. It is a space that feels inevitable to the people who live inside it.</p></div>
    </section>

    <ScrollTour/>

    <section className={styles.projects} id="projects">
      <div className={styles.projectsHeader}><span>B / SELECTED WORK</span><h2>Projects that reward<br/>a closer look.</h2><p>A selection of spaces shaped around light, restraint and the rituals of everyday life.</p></div>
      <div className={styles.projectGrid}>{PROJECTS.map((project,index)=><article className={`${styles.projectCard} ${index%3===1?styles.projectTall:""}`} key={project.title}><div className={styles.projectImage}><img src={project.image} alt={project.title}/><span>{String(index+1).padStart(2,"0")}</span></div><div className={styles.projectCopy}><small>{project.eyebrow}</small><h3>{project.title}</h3><p>{project.meta}</p></div></article>)}</div>
    </section>

    <section className={styles.services}><div className={styles.sectionKicker}>C / SERVICES</div><div className={styles.serviceRows}>{["INTERIOR ARCHITECTURE","SPATIAL PLANNING","BESPOKE JOINERY","MATERIAL DIRECTION"].map((item,i)=><div className={styles.serviceRow} key={item}><span>{String(i+1).padStart(2,"0")}</span><h3>{item}</h3><ArrowUpRight/></div>)}</div></section>

    <section className={styles.future}><div className={styles.futureOrb}>NEXT / SCREEN</div><p>The web is becoming more immersive.</p><h2>We design digital experiences that stand out now — and feel ready for what comes next.</h2><div className={styles.futureMeta}>LARGER DISPLAYS · FOLDABLES · SPATIAL INTERFACES</div></section>

    <section className={styles.contact} id="contact"><div className={styles.contactTop}><span>D / START A PROJECT</span><span data-personalize="location">{STUDIO.location}</span></div><h2>Make your first<br/>impression <em>felt.</em></h2><a href={`mailto:${STUDIO.email}`} data-personalize="contact-email"><span>{STUDIO.email}</span><ArrowRight/></a><footer><div><strong data-personalize="company-name">{STUDIO.name}</strong><small>INTERIOR ARCHITECTURE / MASTER EXPERIENCE</small></div><div><span>INSTAGRAM</span><span>PINTEREST</span><span>LINKEDIN</span></div><small>© 2026 — BUILT FOR THE NEXT SCREEN.</small></footer></section>
  </main>;
}
