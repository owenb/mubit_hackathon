import {readFile,writeFile} from 'node:fs/promises';
import {catalog} from '../src/map-contract.mjs';
const old=JSON.parse(await readFile(new URL('../research/travel/knowledge-before.json',import.meta.url),'utf8'));
// This is a one-time corpus assembly script. Later reviewed examples live in
// data/knowledge.json and must be reconciled explicitly before any regeneration.
const now=new Date().toISOString();
const place=(name)=>catalog.places.filter(p=>p.name===name||p.aliases.includes(name)).sort((a,b)=>b.rank-a.rank)[0]?.id;
const packets=[];
function add(id,title,url,tags,names,notes){packets.push({id,title,url,retrieved_at:now,tags,place_ids:names.map(place).filter(Boolean),notes});}
add('tfl-payment','TfL: paying the right fare','https://tfl.gov.uk/fares/pay-the-right-fare',['payment','contactless','oyster','tap','touch','card','phone','watch','fare','ticket'],[],[
'Touch in and out on rail journeys even when gates are open. On buses and trams touch in only.',
'Use the same card or device throughout a journey. A phone, watch and physical bank card are separate payment identities even when linked to the same bank account.',
'Keep cards separate to avoid card clash. A pink reader can record an interchange avoiding Zone 1; check the single fare finder for the correct route. Missing touches can cause a maximum fare.'
]);
add('tfl-bus-fares','TfL: bus and tram fares','https://tfl.gov.uk/fares/find-fares/bus-and-tram-fares',['bus','tram','hopper','fare','price','cost','cap','november','october','budget'],[],[
'As of 23 October 2026 the adult bus/tram pay-as-you-go single fare is £1.75 and daily cap £5.25. TfL announces £1.85 and £5.55 respectively from 1 November 2026. State the applicable date; do not apply November prices to October.',
'Hopper provides unlimited bus/tram journeys within one hour of the first touch-in, using the same card or device. It is automatic. A negative Oyster balance needs topping up within the hour to qualify.',
'Children aged 5–10 travel free on buses and trams without a Zip card unless they look older than 10. Older-child discounts need the appropriate eligibility/card; do not treat every child as free.'
]);
add('tfl-children','TfL: visitor Oyster and children','https://visitorshop.tfl.gov.uk/en/london-visitor-oyster-card',['children','child','family','kids','under','eleven','11','10','young','visitor','discount'],[],[
'Under-11s travel free on buses and trams. On Tube, DLR, London Overground, Elizabeth line and some National Rail services, up to four under-11s travel free per fare-paying adult. Do not generalise this to every airport train or every National Rail service.',
'Visitors aged 11–15 can receive half-price travel using the Young Visitor discount on a Visitor Oyster card. Ask TfL staff or a Visitor Centre to add it; the child must be present. It is not automatically applied to an ordinary contactless bank card.'
]);
add('tfl-night','TfL: night travel','https://tfl.gov.uk/travel-information/safety/safer-travel-at-night',['night','late','midnight','friday','saturday','sunday','tube','taxi','minicab','home'],[],[
'Night Tube and Night London Overground operate on Friday and Saturday nights, not every night. Night buses provide additional overnight options. Use the current journey planner for the actual date and destination; never promise that an individual service is running now.',
'Only licensed black taxis may be hailed or hired at a rank without a prior booking. Minicabs/private hire must be booked through a licensed operator. Booking or an app does not establish that a route or neighbourhood is risk-free.'
]);
add('tfl-night-lines','TfL: Night Tube lines','https://madeby.tfl.gov.uk/2026/09/07/london-life-as-a-student/',['night','tube','line','weekend','windrush','central','jubilee','northern','piccadilly','victoria'],[],[
'Night Tube runs on the Central, Jubilee, Northern, Piccadilly and Victoria lines on Friday and Saturday nights, with branch/station limitations. Night Overground uses the Windrush line between Highbury & Islington and New Cross Gate. Night buses operate every night. Check exact coverage and disruptions for a journey.'
]);
add('tfl-heathrow','TfL: Heathrow on the Elizabeth line','https://tfl.gov.uk/modes/elizabeth-line/getting-to-and-from-heathrow-on-the-elizabeth-line',['airport','heathrow','terminal','elizabeth','paddington','luggage','suitcase','flight','farringdon'],['Heathrow Terminals 2 & 3','Heathrow Terminal 4','Heathrow Terminal 5','Paddington','Farringdon'],[
'The Elizabeth line links Heathrow with central London including Paddington, Bond Street, Tottenham Court Road, Farringdon, Liverpool Street and Canary Wharf. Check the train destination and airport terminal; not all trains serve the same terminal.',
'TfL publishes about 28 minutes between Paddington and Heathrow on the Elizabeth line. This is a published typical journey, not a live departure or guaranteed arrival time.',
'All Elizabeth line stations have street-to-platform step-free access; all Heathrow rail stations are step-free from train to street. Street-to-platform access elsewhere does not establish level boarding or current lift availability.',
'Elizabeth line transfers between Heathrow Terminals 2 & 3, Terminal 4 and Terminal 5 are free: use contactless or obtain a free inter-terminal ticket. Keep luggage close and aisles clear.'
]);
add('gatwick-rail','Gatwick Airport: rail travel','https://www.gatwickairport.com/transport-options/train.html',['airport','gatwick','south','north','terminal','train','rail','oyster','contactless'],[],[
'Gatwick’s rail station is at the South Terminal. Airport guidance allows Oyster (excluding the 60+ Oyster photocard) or contactless for travel between the airport and London by touching in and out. Advance tickets are another option; compare the actual journey and date rather than declaring one payment method always cheapest.'
]);
add('gatwick-tickets','Gatwick Airport: ticket validity','https://www.gatwickairport.com/To_and_From_the_Airport',['gatwick','travelcard','zone','ticket','airport'],[],[
'Oyster or contactless can be used between Gatwick and central London, but London Travelcards are not valid for the Gatwick leg. Do not infer that a London travel pass covers an airport merely because Oyster is accepted.'
]);
add('tfl-access-help','TfL: wheelchair access and assistance','https://tfl.gov.uk/transport-accessibility/wheelchair-access-and-avoiding-stairs',['access','accessible','wheelchair','ramp','assistance','staff','step','free','mobility'],[],[
'Ask station staff to check the planned step-free journey for disruption. Turn-up-and-go staff can arrange accompaniment to the train, meeting at interchanges/destination, and boarding ramps or mini ramps where available.',
'Street-to-platform access, boarding the train, and interchange are different questions. A lift symbol does not prove a gap-free journey. Neither a neighbourhood pin nor a generally flat promenade certifies an accessible door-to-door route.'
]);
add('tfl-assistance-policy','TfL: accessible travel policy','https://content.tfl.gov.uk/lu-accessible-travel-policy.pdf',['turn','go','book','assistance','disabled','wheelchair','staff'],[],[
'Turn-up-and-go assistance is available on the Underground, Overground and Elizabeth line without advance booking. Ask staff in the ticket hall or use a Help Point information button. Passenger Assist is a separate bookable option. Assistance does not make a station without lifts step-free.'
]);
add('river-tickets','Thames Clippers: tickets','https://www.thamesclippers.com/plan-your-journey/ticket-information',['river','boat','thames','clipper','cruise','uber','cap','travelcard','ferry'],['Cutty Sark','South Bank','Tower Bridge'],[
'Uber Boat by Thames Clippers accepts contactless and Oyster pay-as-you-go; each passenger needs a separate card. Touch in and out with the same card, including at interchanges. River services do not count towards the TfL daily cap.',
'River Bus has West, Central and East fare zones, which are not Tube zones. A qualifying TfL Travelcard on paper or Oyster gives a one-third discount on standard fares, not free river travel. Sightseeing cruises and River Bus tickets are different products.'
]);
add('tfl-cycles','TfL: Santander Cycle sightseeing','https://londonblog.tfl.gov.uk/2023/08/24/santander-cycles-sightseeing/',['cycle','bicycle','bike','hire','santander','dock','green','return'],[],[
'Return Santander Cycles to a docking station and wait for the green light confirming the lock. Return before the ride allowance ends to avoid extra charges. A day pass permits repeated limited-duration rides, not one unlimited continuous hire. Check the current tariff and docking availability; prices are not quoted from this older article.'
]);
add('british-museum','British Museum: visit','https://www.britishmuseum.org/visit',['museum','history','egypt','mummies','british','rain','indoor','free','luggage','bloomsbury'],['British Museum'],[
'The British Museum’s permanent collection is free. Book a free timed ticket for priority entry; walk-ups depend on capacity and can queue. Exhibitions may require separate paid tickets.',
'The museum is on Great Russell Street; Tottenham Court Road, Holborn, Russell Square and Goodge Street are nearby stations. Larger bags and wheeled suitcases are not permitted. Do not recommend it as luggage storage.',
'The collection covers human history, art and culture, including Egyptian material. It is an indoor option for history interests; a suggested duration is a planning choice, not an opening-time guarantee.'
]);
add('natural-history','Natural History Museum: visit','https://www.nhm.ac.uk/visit.html',['museum','dinosaur','dinosaurs','natural','history','animal','children','family','rain','indoor','free','south','kensington'],['Natural History Museum'],[
'Natural History Museum galleries in South Kensington are free. Booking a free entry ticket guarantees entry under its published policy; busy weekends and school holidays can mean queues without one. Some exhibitions/events have separate tickets.',
'The museum on Cromwell Road is a good choice for natural history and dinosaur interests. Its nearby Science Museum and V&A form a practical museum cluster, but a multi-museum afternoon should allow travel and visits rather than promise seeing everything.'
]);
add('science-museum','Science Museum: visit','https://www.sciencemuseum.org.uk/visit',['museum','science','space','engineering','children','family','rain','indoor','free','book','ticket','south','kensington'],['Science Museum'],[
'The Science Museum on Exhibition Road has free general admission but asks visitors to pre-book a free ticket. Free admission does not mean no booking. Some experiences/exhibitions are separately ticketed.',
'The usual published opening is 10:00–18:00. For 24–30 October 2026 the published half-term opening is 09:00. The museum lists a full closure on 11 November 2026. Check the visit page for the actual date; do not state it is open right now without a fresh check.'
]);
add('va-museum','V&A South Kensington: visit','https://www.vam.ac.uk/south-kensington/visit',['museum','art','design','fashion','jewellery','va','v&a','victoria','albert','rain','indoor','free','south','kensington','accessible'],['Victoria and Albert Museum','Knightsbridge'],[
'V&A South Kensington general admission is free and does not need booking; some exhibitions/events cost extra. It is a choice for art and design interests, not the same subject focus as the neighbouring science or natural-history museums.',
'Cromwell Road and Exhibition Road museum entrances are step-free. The museum lists Knightsbridge and Earl’s Court as nearby step-free Tube options. South Kensington being the nearest station does not imply a step-free station route; verify the specific journey.',
'The V&A Fashion Gallery is closed for redevelopment until autumn 2028 according to the visit page checked 23 October 2026. Do not recommend seeing that gallery during this closure. Ask/check which galleries meet the visitor’s interest.'
]);
add('national-gallery','National Gallery: visit','https://www.nationalgallery.org.uk/visiting/plan-your-visit',['gallery','painting','paintings','art','national','trafalgar','free','rain','indoor','friday'],['Trafalgar Square'],[
'The National Gallery is on Trafalgar Square. General admission is free; some exhibitions charge. A free booked ticket offers fast-track entry; walk-up entry is also available.',
'The usual published hours are 10:00–18:00, Friday until 21:00, with listed holiday exceptions. On 23 October 2026 the east wing closes at 18:00 while the rest remains open until 21:00. Check the actual date/wing, not just a generic Friday rule. The map uses the square as an area anchor when no exact gallery feature exists.'
]);
add('tate-modern','Tate Modern: collection and entry','https://www.tate.org.uk/visit/tate-modern',['art','gallery','modern','contemporary','tate','bankside','free','rain','indoor'],['Tate Modern'],[
'Tate Modern on Bankside shows modern and contemporary art. Entry to the collection is free; paid exhibitions are separate and booking is recommended for them. The Turbine Hall is a distinctive part of the building. Do not claim all exhibitions are free or that a particular exhibition is currently available.'
]);
add('greenwich-museums','Royal Museums Greenwich: visit','https://www.rmg.co.uk/plan-your-visit',['greenwich','museum','maritime','queens','queen','observatory','cutty','sark','ship','family','free','history'],['National Maritime Museum',"Queen's House",'Cutty Sark','Greenwich Park'],[
'Royal Museums Greenwich comprises National Maritime Museum, Queen’s House, Cutty Sark and Royal Observatory. National Maritime Museum and Queen’s House have free general entry; Cutty Sark and Royal Observatory are ticketed attractions. Book ahead where possible, and check availability for the date.',
'Greenwich can combine maritime history with the park as a suggested day out. Walking uphill to the Observatory is not equivalent to an audited step-free route; ask about mobility needs and consult the venue’s access guidance.'
]);
add('royal-parks','The Royal Parks: parks','https://www.royalparks.org.uk/visit/parks',['park','garden','green','outdoor','picnic','free','hyde','kensington','relax','walk'],['Hyde Park','Kensington Gardens','Greenwich Park'],[
'London’s Royal Parks are free to explore. Hyde Park and Kensington Gardens are central options for outdoor time, gardens and a quieter change from indoor attractions. Attractions, events and facilities inside parks can have separate charges and opening policies. Free park entry does not make every attraction free.'
]);
add('borough-market','Borough Market: visit','https://boroughmarket.org.uk/visit-us/',['market','food','lunch','street','borough','monday','sunday','eat','budget'],['Borough Market','London Bridge'],[
'Borough Market is free to enter, beside London Bridge station. Food and purchases cost money. The station serves Jubilee, Northern and National Rail.',
'Regular published market hours: Monday closed; Tuesday–Friday 10:00–17:00; Saturday 09:00–17:00; Sunday 10:00–16:00. Holiday/festive exceptions apply. Do not recommend a normal Monday market lunch as if stalls are open or assert live opening without checking.'
]);
add('covent-garden','Covent Garden: visitor FAQs','https://www.coventgarden.london/about/faqs',['covent','garden','piazza','market','theatre','shopping','leicester','walk','free'],['Covent Garden','Leicester Square'],[
'Covent Garden Piazza and Market Building are public spaces free to walk around; individual shops/markets have their own hours. Covent Garden station is on the Piccadilly line. Leicester Square is a short walk away and an alternative when the station is busy.',
'The station’s lifts do not establish a fully step-free route to the trains. Avoid treating lift access and wheelchair accessibility as synonyms. Ask the required destination/route if accessibility matters.'
]);
add('south-bank','South Bank: Queen’s Walk','https://southbank.london/see-and-do/queens-walk',['south','bank','waterloo','riverside','walk','stroll','sunset','thames','outdoor','sightseeing'],['South Bank','National Theatre','Tate Modern','Waterloo'],[
'Queen’s Walk is the pedestrian promenade along South Bank. A suggested stroll can include the National Theatre, Waterloo Bridge, Oxo Tower Wharf and continuing toward Bankside/Tate Modern. The tourism body gives about 30 minutes from Lambeth Bridge to Blackfriars Bridge without extended stops; individual pace varies.',
'A riverside itinerary is a suggested sequence of destinations, not verified turn-by-turn directions or a guaranteed accessible route. Do not generate a route line or certify ramps/lifts from map anchor locations.'
]);
add('hatton-garden','Hatton Garden BID: jewellery quarter','https://www.hatton-garden.london/visit/guides/a-brief-history-of-hatton-garden-jewellers',['hatton','garden','jewellery','jewelry','diamond','leather','lane','market','neighbourhood'],['Hatton Garden'],[
'Hatton Garden is a jewellery district with shops and workshops; nearby Leather Lane has a street-food market. It is a neighbourhood, not the name of a Tube station. Ask for the particular shop/building when discussing entrance accessibility; the district as a whole cannot be certified step-free.'
]);
add('hatton-arrival','Hatton Garden Jeweller: getting here','https://www.hattongardenjeweller.com/contact/',['hatton','garden','farringdon','chancery','lane','station','jewellery'],['Hatton Garden','Farringdon','Chancery Lane'],[
'A local Hatton Garden jeweller on Greville Street identifies Farringdon and Chancery Lane as nearby stations. This is evidence for local arrival options, not a universal accessible entrance or the same walking time for every shop. Farringdon’s Elizabeth line street-to-platform access can be considered alongside the separate TfL evidence; verify the onward pavement/shop route.'
]);
add('sky-garden','Sky Garden: booking','https://skygarden.london/booking/',['sky','garden','view','rooftop','skyline','free','booking','ticket','walkin'],['Sky Garden'],[
'Sky Garden offers free public access tickets, bookable up to three weeks ahead. Tickets specify a date/time and a one-hour visit. Booking is recommended, particularly at weekends; walk-ins depend on capacity and are not guaranteed. Do not invent availability or claim to have made a reservation.'
]);
add('tower-bridge','Visit London: Tower Bridge','https://www.visitlondon.com/things-to-do/place/3901803-tower-bridge',['tower','bridge','london','walk','free','glass','exhibition','photo','sightseeing'],['Tower Bridge'],[
'Crossing Tower Bridge on the public pedestrian route is free. Visiting its interior/high-level exhibition is separately ticketed. Bridge lifts can interrupt crossing; check the published schedule for a specific visit. Tower Bridge and London Bridge are different bridges.'
]);
const facts=packets.flatMap(p=>p.notes.map((text,i)=>({id:`${p.id}-${i+1}`,text,source_ids:[p.id],tags:p.tags,place_ids:p.place_ids})));
const knowledge={...old,version:'homeward-london-travel-2026-10-23-v3',scope:['London travel','TfL payment and night travel','Heathrow and Gatwick','Museums and galleries','Markets and neighbourhoods','Parks and riverside itineraries','Transport accessibility'],sources:[...old.sources,...packets.map(({notes,tags,place_ids,...p})=>p)],facts:[...old.facts.map(f=>({...f,tags:[f.station,'station','step free','accessibility','lift'],place_ids:catalog.places.filter(p=>p.id.startsWith('station:')&&p.name.toLowerCase().includes(f.station.toLowerCase())).map(p=>p.id)})),...facts],rules:[
'Use dated source evidence for factual travel advice. General suggestions can combine supported facts, clearly described as suggested itineraries.',
'Never invent current fares, live departures, availability, safety guarantees, exact travel times, or completed bookings. Published opening hours and future tariff changes must keep their dates and exceptions.',
'No verified end-to-end route engine is connected. Explain sourced transport options and suggest a sequence of places; direct exact time-sensitive routing to the official journey planner.',
'Street-to-platform access, boarding, and interchange differ. Current lift operation requires a separate fresh feed. An absent disruption is not proof everything is operational.',
'Neighbourhoods are not stations; lift access is not automatically a fully accessible route. Ask for a specific building/line/direction when that changes the answer.'
]};
await writeFile(new URL('../research/travel/source-packets.json',import.meta.url),JSON.stringify(packets,null,2));
await writeFile(new URL('../data/knowledge.json',import.meta.url),JSON.stringify(knowledge,null,2));
console.log(JSON.stringify({sources:knowledge.sources.length,facts:knowledge.facts.length,packets:packets.length,version:knowledge.version}));
