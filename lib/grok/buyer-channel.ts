// Deterministic channel recommendation for Grok. Recommendations are not permissions to post.
export type Opportunity={source:string;url:string;summary:string;country:"UK"|"US";kind:"explicit_request"|"apartment_development"|"real_estate_agent"|"rental_operator"|"recent_sale"|"general_discussion";permission:"public_reply_allowed"|"business_email_public"|"opt_in"|"unknown"|"no_contact";product_category?:string;budget?:string;};
export function chooseBuyerChannel(o:Opportunity){
 const source=o.source.toLowerCase();
 const rules=[
  {match:/threads/,channel:"threads",method:"reply_in_existing_thread",reach:"public",risk:1},
  {match:/reddit/,channel:"reddit",method:"helpful_subreddit_comment",reach:"public",risk:2},
  {match:/biggerpockets/,channel:"biggerpockets",method:"answer_relevant_forum_question",reach:"public",risk:2},
  {match:/craigslist|gumtree/,channel:"wanted_ads",method:"respond_to_wanted_listing",reach:"direct_platform",risk:2},
  {match:/airbnb|host|rental/,channel:"host_community",method:"public_recommendation",reach:"public",risk:2},
  {match:/apartments|zumper|rightmove|zillow|developer|leasing/,channel:"property",method:"contact_professional_leasing_office",reach:"business",risk:3},
 ];
 const match=rules.find(r=>r.match.test(source));
 let channel=match?.channel||"public_research";
 let method=match?.method||"research_only";
 const isBusiness=o.kind==="apartment_development"||o.kind==="real_estate_agent"||o.kind==="rental_operator";
 const permittedPublic=o.permission==="public_reply_allowed"&&o.kind==="explicit_request";
 const permittedBusiness=o.permission==="business_email_public"&&isBusiness;
 const optedIn=o.permission==="opt_in";
 let action:"draft_only"|"approved_public_reply"|"approved_business_contact"|"opt_in_followup"="draft_only";
 if(permittedPublic)action="approved_public_reply";
 if(permittedBusiness)action="approved_business_contact";
 if(optedIn)action="opt_in_followup";
 if(o.kind==="recent_sale"||o.permission==="no_contact")action="draft_only";
 const base=o.kind==="explicit_request"?85:o.kind==="rental_operator"?72:o.kind==="apartment_development"?65:o.kind==="real_estate_agent"?55:o.kind==="general_discussion"?30:12;
 const score=Math.max(0,Math.min(100,base+(o.permission==="opt_in"?15:permittedPublic||permittedBusiness?10:-20)+(o.budget?5:0)));
 const subject=o.kind==="apartment_development"?"Free move-in furnishing guide for your residents":o.kind==="rental_operator"?"Furniture and furnishing options for your rental":"Relevant furniture options for your request";
 const pitch=o.kind==="apartment_development"?
  "Offer the leasing team a no-cost YNOT Room QR move-in guide and an optional tracked referral programme. Explain clearly that no tenant personal data is needed.":
  o.kind==="rental_operator"?
  "Reference the operator's specific public furnishing need. Suggest a short list of suitable YNOT items with verified stock and delivery and invite them to request a more detailed quote.":
  o.kind==="explicit_request"?
  "Answer the person's specific question first with useful product characteristics and budget guidance. Include at most one relevant YNOT product link if community rules allow promotional links, and disclose affiliation with YNOT.":
  "Research only until specific buying intent and an appropriate contact route are verified.";
 const blockers:string[]=[];
 if(!o.url.startsWith("https://"))blockers.push("Source URL must be a direct, verifiable HTTPS link.");
 if(o.permission==="unknown"||o.permission==="no_contact")blockers.push("No verified permission to reply or contact.");
 if(o.kind==="recent_sale")blockers.push("A recorded sale is not permission to identify/contact a resident.");
 if(o.kind==="general_discussion")blockers.push("No clear product request.");
 return {score,channel,method,action,subject,pitch,requirements:["Verify exact source and recent date","Check channel-specific terms and rate limits","Check no prior outreach/opt-out","Use up to three verified YNOT product links, never supplier checkout links","Make affiliation explicit","Avoid unsolicited private messaging; approval is still required"],blockers,
  auto_send_allowed:false,auto_publish_allowed:false,
  note:"Grok may prioritize and draft. Publishing on YNOT-owned accounts can be separately approved. Contacting other users must pass permissions and anti-spam checks."};
}
