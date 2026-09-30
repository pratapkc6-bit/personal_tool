/* Zoro Nexus notification service worker */
self.addEventListener("push",event=>{
  let payload={title:"Zoro Nexus",body:"You have a new alert.",url:"/notifications",priority:"NORMAL",alarmSeconds:0};
  try{if(event.data)payload={...payload,...event.data.json()}}catch{}
  const critical=payload.priority==="CRITICAL";
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:"window",includeUncontrolled:true});
    for(const client of windows)client.postMessage({type:"ZORO_PUSH",payload});
    await self.registration.showNotification(payload.title,{
      body:payload.body,
      tag:payload.notificationId||undefined,
      renotify:Boolean(payload.notificationId),
      requireInteraction:critical,
      silent:false,
      data:{url:payload.url||"/notifications",notificationId:payload.notificationId,alarmSeconds:payload.alarmSeconds||0},
      actions:[{action:"open",title:"Open Zoro"},{action:"dismiss",title:"Dismiss"}]
    });
  })());
});
self.addEventListener("notificationclick",event=>{
  event.notification.close();
  if(event.action==="dismiss")return;
  const target=event.notification.data?.url||"/notifications";
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:"window",includeUncontrolled:true});
    for(const client of windows){
      if("focus" in client){await client.focus();if("navigate" in client)await client.navigate(target);return}
    }
    if(self.clients.openWindow)await self.clients.openWindow(target);
  })());
});
self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",event=>event.waitUntil(self.clients.claim()));
