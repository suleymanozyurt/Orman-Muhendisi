export function nextTab(key: string, index: number, count: number): number | undefined {
  if(count<1)return;
  if(key==="Home")return 0;
  if(key==="End")return count-1;
  if(key==="ArrowRight")return (index+1)%count;
  if(key==="ArrowLeft")return (index+count-1)%count;
}
