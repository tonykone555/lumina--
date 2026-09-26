import type {Metadata} from "next";

export const metadata:Metadata={
  title:"Privacy Policy | YNOT World",
  description:"Privacy Policy for YNOT World, operated by Assix, including use of Meta and Threads integrations.",
  alternates:{canonical:"/privacy"}
};

const sectionStyle={marginTop:28} as const;

export default function PrivacyPage(){
  return <main style={{minHeight:"100vh",background:"#f4f4f1",color:"#151515",fontFamily:"ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif",padding:"48px 20px 72px"}}>
    <article style={{maxWidth:860,margin:"0 auto",background:"#fff",border:"1px solid rgba(0,0,0,.08)",borderRadius:24,padding:"clamp(24px,5vw,56px)",boxShadow:"0 20px 60px rgba(0,0,0,.06)"}}>
      <a href="/" style={{display:"inline-block",color:"inherit",textDecoration:"none",fontWeight:800,letterSpacing:"-.02em",marginBottom:28}}>YNOT</a>
      <p style={{fontSize:12,letterSpacing:".14em",textTransform:"uppercase",opacity:.55,margin:"0 0 10px"}}>Privacy Policy</p>
      <h1 style={{fontSize:"clamp(36px,7vw,64px)",lineHeight:.98,letterSpacing:"-.055em",margin:"0 0 18px"}}>YNOT World Privacy Policy</h1>
      <p style={{fontSize:14,opacity:.6,margin:"0 0 28px"}}>Last updated: September 26, 2026</p>

      <p style={{fontSize:17,lineHeight:1.7,margin:0}}>This Privacy Policy explains how YNOT World ("YNOT", "we", "us", or "our"), operated by Assix, collects, uses, stores, and shares information when you use ynotworld.app, related YNOT services, and connected third-party integrations such as Meta and Threads.</p>

      <section style={sectionStyle}>
        <h2>1. Information we collect</h2>
        <p>Depending on how you use YNOT, we may collect information you provide directly, such as your name, profile image, saved products, account or profile details, support messages, and shopping preferences. We may also collect technical and usage information such as browser type, device type, IP address, approximate region, language, interactions with YNOT features, searches, clicks, and session or error information.</p>
        <p>If you choose a shopping region, YNOT may store your selected country, currency, and language preference so prices, checkout, and voice features can be localized.</p>
      </section>

      <section style={sectionStyle}>
        <h2>2. Meta and Threads data</h2>
        <p>YNOT may connect to Meta products, including Threads, through official APIs when those integrations are enabled and approved. Depending on the permissions granted to YNOT and the capabilities made available by Meta, YNOT may access data such as public profile information, public posts or Threads content, post identifiers, captions or text, timestamps, engagement information, comments or replies, and other data returned by Meta's APIs.</p>
        <p>Where Meta permits keyword or content search through its APIs, YNOT may use that capability to help users discover relevant public content, creators, brands, or conversations. YNOT does not claim access to data that Meta does not provide through approved permissions or official APIs.</p>
        <p>YNOT uses Meta and Threads data only to provide requested features, improve product discovery and research workflows, support publishing or analytics features where authorized, troubleshoot integrations, and maintain platform security and reliability.</p>
      </section>

      <section style={sectionStyle}>
        <h2>3. How we use information</h2>
        <p>We may use information to operate and improve YNOT, personalize shopping and discovery, localize currency and language, provide voice search, save user preferences, process account or checkout-related actions, maintain security, prevent abuse, provide support, analyze product performance, and comply with legal or platform requirements.</p>
      </section>

      <section style={sectionStyle}>
        <h2>4. Cookies and local storage</h2>
        <p>YNOT may use cookies, browser storage, and similar technologies to remember settings such as theme, selected country, currency, language, profile information, saved items, cart state, and session information. Some features may not work correctly if these technologies are disabled.</p>
      </section>

      <section style={sectionStyle}>
        <h2>5. Third-party services</h2>
        <p>YNOT may rely on third-party services for hosting, authentication, analytics, payments, commerce, AI features, media processing, and social integrations. These providers may process data according to their own privacy policies and contractual terms. Examples may include Meta, Threads, Stripe, Supabase, Vercel, Shopify, and other connected services used by YNOT.</p>
      </section>

      <section style={sectionStyle}>
        <h2>6. Data sharing</h2>
        <p>We do not sell personal information. We may share information with service providers where necessary to operate YNOT, comply with law, protect users or the service, complete transactions, or perform actions you request. Information may also be shared when required by a valid legal request or to investigate fraud, abuse, or security incidents.</p>
      </section>

      <section style={sectionStyle}>
        <h2>7. Data retention</h2>
        <p>We retain information only for as long as reasonably necessary for the purposes described in this Policy, to maintain the service, meet contractual or legal requirements, resolve disputes, enforce agreements, and protect YNOT. Retention periods may vary depending on the type of information and the service involved.</p>
      </section>

      <section style={sectionStyle}>
        <h2>8. Data deletion and user requests</h2>
        <p>You may request access to, correction of, or deletion of personal information associated with YNOT by contacting us at <a href="mailto:tonykone555@gmail.com">tonykone555@gmail.com</a>. We may need to verify your identity before completing certain requests.</p>
        <p>For information obtained from Meta or Threads, you may also revoke YNOT's access through your Meta account settings where available. If required by Meta platform rules, we will delete or stop processing applicable Meta platform data after a valid deletion request or loss of authorization, subject to legal retention obligations.</p>
      </section>

      <section style={sectionStyle}>
        <h2>9. Security</h2>
        <p>We use reasonable technical and organizational safeguards designed to protect information from unauthorized access, loss, misuse, alteration, or disclosure. No online system can be guaranteed to be completely secure.</p>
      </section>

      <section style={sectionStyle}>
        <h2>10. International processing</h2>
        <p>YNOT and its service providers may process information in countries other than the country where you live. Where required, we take reasonable steps to use appropriate safeguards for international data transfers.</p>
      </section>

      <section style={sectionStyle}>
        <h2>11. Children's privacy</h2>
        <p>YNOT is not directed to children under the minimum age required to consent to online services in their jurisdiction. We do not knowingly collect personal information from children in violation of applicable law.</p>
      </section>

      <section style={sectionStyle}>
        <h2>12. Changes to this Policy</h2>
        <p>We may update this Privacy Policy from time to time. When we do, we will update the date at the top of this page. Material changes may also be communicated through YNOT where appropriate.</p>
      </section>

      <section style={sectionStyle}>
        <h2>13. Contact</h2>
        <p>YNOT World is operated by Assix.</p>
        <p>Privacy and support contact: <a href="mailto:tonykone555@gmail.com">tonykone555@gmail.com</a></p>
        <p>Website: <a href="https://ynotworld.app">ynotworld.app</a></p>
      </section>
    </article>
  </main>
}
