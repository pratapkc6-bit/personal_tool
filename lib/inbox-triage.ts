export type InboxTriageItem={
  id:string;
  sender:string|null;
  classification:string;
  requiresAction:boolean;
  importance:string;
  deadlineAt:Date|null;
  receivedAt:Date|null;
  processedAt:Date;
};

export function buildInboxTriage(items:InboxTriageItem[],now=new Date()){
  const action=items.filter(x=>x.requiresAction);
  const urgent=action.filter(x=>x.importance==="URGENT");
  const due24=action.filter(x=>x.deadlineAt&&x.deadlineAt.getTime()>=now.getTime()&&x.deadlineAt.getTime()<=now.getTime()+86400000);
  const security=items.filter(x=>x.classification==="SECURITY");
  const waiting=items.filter(x=>x.classification==="WAITING");
  const aging=action.filter(x=>(now.getTime()-(x.receivedAt||x.processedAt).getTime())>=72*3600000);
  const senderMap=new Map<string,number>();
  for(const item of action){
    const sender=(item.sender||"Unknown sender").trim();
    senderMap.set(sender,(senderMap.get(sender)||0)+1);
  }
  const senderHotspots=[...senderMap.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([sender,count])=>({sender,count}));
  const classMap=new Map<string,number>();
  for(const item of items)classMap.set(item.classification,(classMap.get(item.classification)||0)+1);
  const classifications=[...classMap.entries()].sort((a,b)=>b[1]-a[1]).map(([classification,count])=>({classification,count}));
  const newest=items.reduce<Date|null>((latest,item)=>!latest||item.processedAt>latest?item.processedAt:latest,null);
  const scanAgeHours=newest?Math.max(0,Math.round((now.getTime()-newest.getTime())/3600000)):null;
  return {
    counts:{action:action.length,urgent:urgent.length,due24:due24.length,security:security.length,waiting:waiting.length,aging:aging.length},
    senderHotspots,classifications,scanAgeHours,fresh:scanAgeHours!==null&&scanAgeHours<24
  };
}