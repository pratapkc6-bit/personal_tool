export type NtHoliday = { date: string; title: string; kind: "public" | "regional" | "part-day" };

const DATA: Record<number, NtHoliday[]> = {
  2026: [
    {date:"2026-01-01",title:"New Year's Day",kind:"public"},{date:"2026-01-26",title:"Australia Day",kind:"public"},
    {date:"2026-04-03",title:"Good Friday",kind:"public"},{date:"2026-04-04",title:"Easter Saturday",kind:"public"},
    {date:"2026-04-05",title:"Easter Sunday",kind:"public"},{date:"2026-04-06",title:"Easter Monday",kind:"public"},
    {date:"2026-04-25",title:"Anzac Day",kind:"public"},{date:"2026-05-04",title:"May Day",kind:"public"},
    {date:"2026-06-08",title:"King's Birthday",kind:"public"},{date:"2026-07-24",title:"Darwin Show Day",kind:"regional"},
    {date:"2026-08-03",title:"Picnic Day",kind:"public"},{date:"2026-12-24",title:"Christmas Eve",kind:"part-day"},
    {date:"2026-12-25",title:"Christmas Day",kind:"public"},{date:"2026-12-26",title:"Boxing Day",kind:"public"},
    {date:"2026-12-28",title:"Additional public holiday for Boxing Day",kind:"public"},{date:"2026-12-31",title:"New Year's Eve",kind:"part-day"}
  ],
  2027: [
    {date:"2027-01-01",title:"New Year's Day",kind:"public"},{date:"2027-01-26",title:"Australia Day",kind:"public"},
    {date:"2027-03-26",title:"Good Friday",kind:"public"},{date:"2027-03-27",title:"Easter Saturday",kind:"public"},
    {date:"2027-03-28",title:"Easter Sunday",kind:"public"},{date:"2027-03-29",title:"Easter Monday",kind:"public"},
    {date:"2027-04-26",title:"Anzac Day",kind:"public"},{date:"2027-05-03",title:"May Day",kind:"public"},
    {date:"2027-06-14",title:"King's Birthday",kind:"public"},{date:"2027-07-23",title:"Darwin Show Day",kind:"regional"},
    {date:"2027-08-02",title:"Picnic Day",kind:"public"},{date:"2027-12-24",title:"Christmas Eve",kind:"part-day"},
    {date:"2027-12-25",title:"Christmas Day",kind:"public"},{date:"2027-12-26",title:"Boxing Day",kind:"public"},
    {date:"2027-12-27",title:"Additional public holiday for Christmas Day",kind:"public"},{date:"2027-12-28",title:"Additional public holiday for Boxing Day",kind:"public"},
    {date:"2027-12-31",title:"New Year's Eve",kind:"part-day"}
  ],
  2028: [
    {date:"2028-01-01",title:"New Year's Day",kind:"public"},{date:"2028-01-03",title:"Additional public holiday for New Year's Day",kind:"public"},
    {date:"2028-01-26",title:"Australia Day",kind:"public"},{date:"2028-04-14",title:"Good Friday",kind:"public"},
    {date:"2028-04-15",title:"Easter Saturday",kind:"public"},{date:"2028-04-16",title:"Easter Sunday",kind:"public"},
    {date:"2028-04-17",title:"Easter Monday",kind:"public"},{date:"2028-04-25",title:"Anzac Day",kind:"public"},
    {date:"2028-05-01",title:"May Day",kind:"public"},{date:"2028-06-12",title:"King's Birthday",kind:"public"},
    {date:"2028-07-28",title:"Darwin Show Day",kind:"regional"},{date:"2028-08-07",title:"Picnic Day",kind:"public"},
    {date:"2028-12-24",title:"Christmas Eve",kind:"part-day"},{date:"2028-12-25",title:"Christmas Day",kind:"public"},
    {date:"2028-12-26",title:"Boxing Day",kind:"public"},{date:"2028-12-31",title:"New Year's Eve",kind:"part-day"}
  ]
};

export function getNtHolidays(date: string) {
  const year=Number(date.slice(0,4));
  return (DATA[year]||[]).filter(item=>item.date===date);
}

export function listNtHolidays(year: number) {
  return DATA[year]||[];
}
