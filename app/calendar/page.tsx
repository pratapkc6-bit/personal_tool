import { Suspense } from "react";
import { CalendarDays } from "lucide-react";
import { CalendarBoard } from "@/components/calendar-board";
import { EventCreator } from "@/components/event-creator";
import { ImmersiveSectionArt } from "@/components/immersive-section-art";

export default function CalendarPage() {
  return (
    <div className="nexus-page immersive-page immersive-page-timeline">
      <ImmersiveSectionArt src="/assets/zoro-timeline-approved.png" alt="Zoro Timeline Dark Realm" kind="timeline" hotspots={[
        {href:"/search",label:"Search",className:"hs-top-search"},
        {href:"/settings",label:"Settings",className:"hs-top-settings"},
        {href:"#live-calendar",label:"Add event",className:"hs-timeline-add"},
        {href:"/calendar",label:"Today",className:"hs-timeline-today"},
        {href:"/",label:"Home",className:"hs-nav-home"},
        {href:"/calendar",label:"Timeline",className:"hs-nav-timeline"},
        {href:"/assistant",label:"Zoro",className:"hs-nav-zoro"},
        {href:"/intelligence",label:"Intel",className:"hs-nav-intel"},
        {href:"/settings",label:"More",className:"hs-nav-more"},
      ]}/>
      <div id="live-calendar" className="immersive-live-layer">
      <div className="nexus-page-heading">
        <div className="nexus-page-icon"><CalendarDays size={22} /></div>
        <div className="nexus-page-title">
          <p className="nexus-kicker">TEMPORAL MAP</p>
          <h1>Your timeline</h1>
          <p>See commitments, protect focus windows and preview every calendar write before it happens.</p>
        </div>
        <Suspense fallback={<div className="nexus-action-skeleton" aria-hidden />}>
          <EventCreator />
        </Suspense>
      </div>
      <CalendarBoard />
      </div>
    </div>
  );
}
