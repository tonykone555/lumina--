export type DiscoverySource="keyword"|"related"|"learned_keyword";

export type InstagramProfile={
  id:string;
  username:string;
  fullName?:string;
  profileUrl?:string;
  profilePictureUrl?:string;
  recentPostImageUrl?:string;
  recentPostCaption?:string|null;
  followers?:number|null;
  following?:number|null;
  postsCount?:number|null;
  biography?:string|null;
  website?:string|null;
  category?:string|null;
  isPrivate?:boolean|null;
  isVerified?:boolean|null;
  isBusiness?:boolean|null;
  publicEmail?:string|null;
  publicPhone?:string|null;
  source:DiscoverySource;
  sourceQuery?:string;
  rank?:number|null;
};

export type DiscoveryEdge={
  parentUsername:string;
  childUsername:string;
  edgeType:"instagram_suggested";
  rank?:number|null;
};

export type DiscoveryProfile=InstagramProfile&{
  parentUsernames:string[];
  sharedParentCount:number;
  discoveryDepth:number;
  relevanceScore:number;
};

export type DiscoveryRequest={
  query:string;
  target?:number;
  keywordPages?:number;
  relatedPerSeed?:number;
  seedExpansionLimit?:number;
  learnedKeywords?:string[];
  seedUsernames?:string[];
  enrichProfiles?:boolean;
};

export type DiscoveryResponse={
  searchId:string;
  query:string;
  target:number;
  uniqueCount:number;
  newCount:number;
  reusedCount:number;
  profiles:DiscoveryProfile[];
  edges:DiscoveryEdge[];
  learnedKeywords:string[];
  exhausted:boolean;
  persistence:"supabase"|"none";
};
