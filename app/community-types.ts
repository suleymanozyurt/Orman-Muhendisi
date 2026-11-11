export type CommunityPerson={id:string;name:string;count:number;following:boolean;image?:string};
export type CommunityStory={id:string;userId:string;author:string;image:string;date:string;plantId?:string;note:string};
export type CommunityData={userId:string;following:string[];followingCount:number;followerCount:number;people:CommunityPerson[];stories:CommunityStory[]};
