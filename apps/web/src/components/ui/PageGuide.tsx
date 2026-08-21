import React, { useEffect, useRef } from 'react';
import { HelpCircle, ArrowUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import styles from './PageGuide.module.css';

gsap.registerPlugin(ScrollTrigger);

// ─── TERMINOLOGY GLOSSARY DEFINITIONS ──────────────────────────────────────
export const GLOSSARY: Record<string, { term: string; definition: string }> = {
  incident: {
    term: 'Incident',
    definition: 'An active emergency, disaster threat, or event reported in the network requiring response coordination.'
  },
  demand: {
    term: 'Demand / Request',
    definition: 'A specific request stating what supplies or assistance is needed, where it is needed, and how urgent it is.'
  },
  resource: {
    term: 'Resource',
    definition: 'Supplies, professional equipment, medical kits, or personnel available in depots to support response efforts.'
  },
  allocation: {
    term: 'Allocation',
    definition: 'The specific resource stock matching and reserved to satisfy an active Request for Help.'
  },
  dispatch: {
    term: 'Dispatch',
    definition: 'The logistics stage where an assigned vehicle is deployed to transport resources to the emergency site.'
  },
  delivery: {
    term: 'Delivery',
    definition: 'The final operational check confirming that the dispatched vehicle has arrived and successfully handed over relief cargo.'
  },
  fulfillment: {
    term: 'Fulfillment',
    definition: 'The calculation of how much of the requested demand was successfully delivered and verified on-site.'
  },
  severity: {
    term: 'Severity',
    definition: 'The level of danger an emergency poses (Critical, High, Medium, Low), determining response queue priority.'
  },
  priority: {
    term: 'Priority',
    definition: 'The urgency weighting of a request, used to identify which demands should be allocated first.'
  },
  shelterCapacity: {
    term: 'Shelter Capacity',
    definition: 'The live occupancy status showing how many bed spaces are currently available in a regional shelter.'
  }
};

// ─── GUIDE DATA LAYERS FOR EVERY MAJOR PAGE ──────────────────────────────────
export interface GuideConfig {
  title: string;
  intro: string;
  whyExists: string;
  whoIsItFor: string[];
  whatCanYouDo: string[];
  howToUse: { step: string; desc: string }[];
  importantRules: string;
  workflow: string[];
}

export const pageGuides: Record<string, GuideConfig> = {
  home: {
    title: 'HOW SAKSHAM WORKS',
    intro: 'SAKSHAM connects people who need help with the resources and response teams that can provide it.',
    whyExists: 'During emergencies, coordination gaps delay help. SAKSHAM brings all pieces together to save response time.',
    whoIsItFor: ['Civilians in distress', 'Operational volunteers', 'First responders', 'System managers'],
    whatCanYouDo: [
      'Submit emergency SOS distressed calls',
      'Locate operational shelters nearby',
      'Track live response metrics and analytics overview',
      'Access help guides and helpline emergency contacts'
    ],
    howToUse: [
      { step: 'Identify your situation', desc: 'Civilians should choose public actions while operators enter the Command Center.' },
      { step: 'Check local resource metrics', desc: 'Review the live map on the landing hero section to check active operations.' },
      { step: 'Seek or provide assistance', desc: 'File a distressed SOS request if you need support, or explore options if helping.' }
    ],
    importantRules: 'The homepage is intended for public safety and general overview. Operational tasks are restricted to the Command Center.',
    workflow: ['INCIDENT', 'DEMAND', 'ALLOCATE', 'DISPATCH', 'DELIVERY', 'RESOLUTION']
  },
  commandCentre: {
    title: 'HOW THE COMMAND CENTRE WORKS',
    intro: 'The Command Centre gives response teams a live overview of what is happening across the disaster-response network. It helps operators understand which incidents need attention, what resources are available and where response activity is currently taking place.',
    whyExists: 'During an emergency, information is often spread across different teams and locations. The Command Centre brings the most important operational information together so response teams can make decisions faster.',
    whoIsItFor: ['Response operators', 'Emergency coordinators', 'District/regional authorities', 'Incident commanders', 'Authorized operational staff'],
    whatCanYouDo: [
      'Monitor active incidents',
      'Review urgent demands',
      'Understand current resource availability',
      'Track response activity',
      'Identify situations requiring attention',
      'Move into Matching, Dispatch and Delivery'
    ],
    howToUse: [
      { step: 'Review active incidents', desc: 'Check the incident registry list to monitor what events are currently reported.' },
      { step: 'Identify issues needing attention', desc: 'Sort by severity or status to find critical situations lacking matched supplies.' },
      { step: 'Open Incident Workspace', desc: 'Drill down into a specific event case file to coordinate its detailed timeline.' },
      { step: 'Allocate, Dispatch, and Track', desc: 'Move fluidly from the workspace into matching, authoring dispatch, and checking delivery.' }
    ],
    importantRules: 'The Command Centre is an operational overview. Detailed incident decisions should be made inside the relevant Incident Workspace.',
    workflow: ['INCIDENT', 'ASSESS', 'DEMAND', 'MATCH', 'DISPATCH', 'DELIVERY', 'RESOLVE']
  },
  incidents: {
    title: 'HOW INCIDENT RESPONSE REGISTRY WORKS',
    intro: 'The Incident Registry is the central list of emergencies currently known to SAKSHAM.',
    whyExists: 'It allows response teams to quickly see which incidents are active, how serious they are and which situations may require immediate attention.',
    whoIsItFor: ['Response operators', 'Incident coordinators', 'Regional authorities'],
    whatCanYouDo: [
      'Search and filter incidents by urgency',
      'Log manual incident reports from field dispatchers',
      'Verify status and priority labels',
      'Open the detailed Incident Workspace case files'
    ],
    howToUse: [
      { step: 'Find the relevant incident', desc: 'Filter using query tags or severity categories to isolate the desired emergency.' },
      { step: 'Log manual entry if needed', desc: 'Use the Manual Incident button to register reports phoned in from field offices.' },
      { step: 'Review status and verify', desc: 'Confirm reported events to verified status so they become eligible for matching.' }
    ],
    importantRules: 'Verify incoming reports promptly. Unverified incidents can cause matching delays for relief teams.',
    workflow: ['REPORTED', 'VERIFIED', 'ASSESSING', 'RESOURCE_MATCHED', 'DISPATCHED', 'RESOLVED']
  },
  incidentWorkspace: {
    title: 'HOW THE INCIDENT WORKSPACE WORKS',
    intro: 'The Incident Workspace is the detailed operational view of one emergency.',
    whyExists: 'It brings everything related to a single incident into one place so response teams do not have to search through multiple systems.',
    whoIsItFor: ['Field coordinators', 'Command desk operators', 'Tactical commanders'],
    whatCanYouDo: [
      'Review incident location coordinates and map telemetry',
      'Check outstanding demands and resource match states',
      'Add chronological timeline event logs',
      'Find nearby shelter networks and coordinate relocations',
      'Authorize resolution closure reviews'
    ],
    howToUse: [
      { step: 'Read the situation summary', desc: 'Understand the location details, estimated people affected, and general severity.' },
      { step: 'Track outstanding needs', desc: 'Verify what resources are requested, and match those that are still unmatched.' },
      { step: 'Update timeline logs', desc: 'Add progress entries from field teams to keep the central operational board updated.' },
      { step: 'Perform closure resolution', desc: 'Trigger incident resolution once all requests are verified as fulfilled.' }
    ],
    importantRules: 'The Incident Workspace does not replace Matching, Dispatch or Delivery. It connects those systems around one incident.',
    workflow: ['SITUATION', 'NEEDS', 'MATCHING', 'DISPATCH', 'DELIVERY', 'RESOLUTION']
  },
  demand: {
    title: 'HOW REQUESTS FOR HELP WORK',
    intro: 'A request for help (demand) specifies what supplies or assistance is needed, where it is needed and how urgent it is.',
    whyExists: 'Without explicit quantities and locations, logistics teams cannot load correct vehicle cargoes, causing wastage or shortage.',
    whoIsItFor: ['Depot managers', 'Logistics operators', 'Regional directors'],
    whatCanYouDo: [
      'Monitor incoming requests for help',
      'Verify quantities and resource types requested',
      'Assess request priority weighting',
      'Launch matching allocations for open demands'
    ],
    howToUse: [
      { step: 'Review the requested items', desc: 'Check the resource type (e.g. water, kits) and quantity required.' },
      { step: 'Confirm target coordinates', desc: 'Ensure the destination location is clearly defined for route planning.' },
      { step: 'Initiate resource match', desc: 'Select the Match action to query available depot stocks for allocation.' }
    ],
    importantRules: 'Always review request quantities against available depot stock limits before committing allocations.',
    workflow: ['PENDING', 'ALLOCATED', 'DISPATCHED', 'EN_ROUTE', 'FULFILLED']
  },
  matching: {
    title: 'HOW RESOURCE MATCHING WORKS',
    intro: 'Matching helps connect a request for help with the most suitable available resource.',
    whyExists: 'During a disaster, many requests may compete for limited resources. Matching helps response teams identify suitable options quickly.',
    whoIsItFor: ['Response coordinators', 'Depot logicians', 'Procurement managers'],
    whatCanYouDo: [
      'Query compatible resource types across network depots',
      'Analyze deterministic suitability matches',
      'Approve matched allocations',
      'Commit stock reserves for dispatch'
    ],
    howToUse: [
      { step: 'Select active demand', desc: 'Choose a pending request from the left-side queue to load suggestions.' },
      { step: 'Compare options', desc: 'Review suggested depots based on distance, quantity, and compatibility.' },
      { step: 'Commit stock allocation', desc: 'Approve the match to move the request into the logistics dispatch pipeline.' }
    ],
    importantRules: 'SAKSHAM assists with matching. The authorized operator remains responsible for approving the final allocation.',
    workflow: ['REQUEST', 'SEARCH', 'SUITABILITY', 'ALLOCATION', 'COMMIT']
  },
  dispatch: {
    title: 'HOW DISPATCH WORKS',
    intro: 'Dispatch coordinates the movement of an assigned resource to where it is needed.',
    whyExists: 'Knowing what resource is required is only the first step. Dispatch turns that allocation into an actual field mission.',
    whoIsItFor: ['Logistics coordinators', 'Fleet dispatchers', 'Depot loading crews'],
    whatCanYouDo: [
      'Assign compatible vehicles to approved allocations',
      'Review driver coordinates and route paths',
      'Monitor live fuel, ETA, and signal telemetry',
      'Authorize logistics deployment departures'
    ],
    howToUse: [
      { step: 'Select verified allocation', desc: 'Load committed requests awaiting vehicle assignment.' },
      { step: 'Assign available vehicle', desc: 'Choose a compatible vehicle with enough capacity from the depot fleet.' },
      { step: 'Confirm operator and dispatch', desc: 'Input driver name and click Authorize to start the field mission.' }
    ],
    importantRules: 'Do not dispatch a resource unless the assignment, destination and required quantity have been verified.',
    workflow: ['ASSIGNED', 'LOADED', 'DISPATCHED', 'EN_ROUTE', 'ARRIVED']
  },
  delivery: {
    title: 'HOW DELIVERY & RELIEF VERIFICATION WORKS',
    intro: 'Delivery confirms whether the assistance sent through Dispatch actually reached the destination.',
    whyExists: 'Sending a resource is not the same as successfully delivering help. Delivery closes the gap between deployment and real-world fulfillment.',
    whoIsItFor: ['Field officers', 'Receiving authorities', 'Compliance auditors'],
    whatCanYouDo: [
      'Register arrival at destination zones',
      'Record on-site distribution quantities',
      'Handle exceptions (rejections, damages)',
      'Trigger stock reconciliation for surpluses',
      'Generate follow-up demands for partial fulfillments'
    ],
    howToUse: [
      { step: 'Track vehicle arrival', desc: 'Verify that the dispatched vehicle registers as ARRIVED at target coordinates.' },
      { step: 'Record verified delivery quantity', desc: 'Input the exact quantity received by field teams.' },
      { step: 'Submit handover signature reference', desc: 'Verify the delivery to update request states and return vehicles to fleet.' }
    ],
    importantRules: 'Do not mark the request complete until the remaining need is addressed or formally closed.',
    workflow: ['ARRIVED', 'HANDOVER', 'VERIFY', 'RECONCILE', 'FOLLOW_UP']
  },
  resources: {
    title: 'HOW THE RESOURCE REGISTRY WORKS',
    intro: 'The Resource Registry shows supplies, equipment and other resources available to support disaster response.',
    whyExists: 'It provides command teams with accurate stock tallies so they do not allocate imaginary materials during crises.',
    whoIsItFor: ['Warehouse managers', 'Procurement planners', 'Command desk logicians'],
    whatCanYouDo: [
      'Search resource stocks and materials',
      'Filter stocks by depot location or category',
      'Monitor allocation and reserve quantities',
      'Identify depots suffering from critical low stocks'
    ],
    howToUse: [
      { step: 'Browse inventory listings', desc: 'Review available quantities of clean water, food packs, medicine, and boats.' },
      { step: 'Track allocated levels', desc: 'Check what percentage of depot stock is currently reserved for active missions.' },
      { step: 'Perform stock replenishment', desc: 'Coordinate transfers between surplus depots and depleted regional hubs.' }
    ],
    importantRules: 'Availability can change quickly during an emergency. Always check the latest update before assigning a resource.',
    workflow: ['AVAILABLE', 'ALLOCATED', 'IN_TRANSIT', 'DEPLETED']
  },
  vehicles: {
    title: 'HOW THE VEHICLE FLEET WORKS',
    intro: 'The Vehicle Fleet shows response vehicles available across the network and their current operational status.',
    whyExists: 'It ensures that logistics teams can quickly identify available transport types (trucks, boats, helicopters) matching emergency zones.',
    whoIsItFor: ['Fleet managers', 'Logistics planners', 'Transport crews'],
    whatCanYouDo: [
      'Track live locations and statuses of emergency vehicles',
      'Check vehicle capacities and type categories',
      'Monitor active route paths and driver details',
      'Verify vehicle return status for next dispatches'
    ],
    howToUse: [
      { step: 'Check vehicle status', desc: 'Filter for AVAILABLE units to quickly load candidates for dispatch.' },
      { step: 'Review telemetry details', desc: 'Inspect driver name, current cargo weight, fuel percentage, and coordinates.' },
      { step: 'Monitor returning vehicles', desc: 'Track vehicles returning from deliveries to queue them for upcoming dispatches.' }
    ],
    importantRules: 'Review availability before dispatching. Never assume a vehicle is available simply because it appeared available earlier.',
    workflow: ['AVAILABLE', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'RETURNING']
  },
  shelters: {
    title: 'HOW THE SHELTER NETWORK WORKS',
    intro: 'The Shelter Network helps users find emergency shelters and understand their current capacity and facilities.',
    whyExists: 'During evacuations, command teams and civilians must know which safe havens still have beds and water available.',
    whoIsItFor: ['Civilians in evacuation zones', 'Volunteers', 'Regional coordinators', 'Transit authorities'],
    whatCanYouDo: [
      'Locate regional shelter positions on map coordinates',
      'Monitor live occupancy and bed capacity percentages',
      'Verify facilities available (medical, food, water, power)',
      'Update status flags for open/closed shelters'
    ],
    howToUse: [
      { step: 'Search near evac zones', desc: 'Isolate shelters close to critical floodplains or threat coordinates.' },
      { step: 'Review available capacity', desc: 'Identify shelters showing less than 90% occupancy to avoid overcrowding.' },
      { step: 'Check facility amenities', desc: 'Ensure selected shelter supports necessary requirements like medical care.' }
    ],
    importantRules: 'Shelter capacity can change quickly. Always check the latest update before directing people to a facility.',
    workflow: ['OPEN', 'NEAR_CAPACITY', 'FULL', 'CLOSED']
  },
  analytics: {
    title: 'HOW OPERATIONAL ANALYTICS WORK',
    intro: 'Analytics helps response teams understand what is happening across the system over time.',
    whyExists: 'It enables directors to identify bottlenecks, evaluate resource fulfillment ratios, and plan network expansions.',
    whoIsItFor: ['Directorate heads', 'Auditors', 'Operational planners'],
    whatCanYouDo: [
      'Review incident frequencies and response velocity metrics',
      'Track resource depletion speeds and depot stocks',
      'Analyze shelter occupancy rates across zones',
      'Assess dispatch-to-delivery elapsed durations'
    ],
    howToUse: [
      { step: 'Analyze the trend lines', desc: 'Identify if incident counts are rising or response speeds are stabilizing.' },
      { step: 'Spot bottlenecks', desc: 'Isolate depots experiencing delayed loading or segments showing high rejections.' },
      { step: 'Optimize network stock', desc: 'Re-distribute depot inventory levels based on long-term demand trends.' }
    ],
    importantRules: 'Analytics supports decision-making. It should be used alongside current incident information rather than as a replacement for live operational judgment.',
    workflow: ['DATA_INGEST', 'TREND_PLOT', 'METRIC_SCORE', 'PREDICTION', 'DECISION']
  }
};

// ─── TRIGGER COMPONENT ──────────────────────────────────────────────────────
interface PageGuideTriggerProps {
  onClick?: () => void;
}

export const PageGuideTrigger: React.FC<PageGuideTriggerProps> = ({ onClick }) => {
  const { t } = useTranslation();
  const handleScrollToGuide = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onClick) {
      onClick();
      return;
    }

    const guideEl = document.getElementById('page-guidebook');
    if (!guideEl) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      guideEl.scrollIntoView({ behavior: 'auto' });
      // Stagger focus fallback
      const heading = guideEl.querySelector('h2');
      if (heading) heading.focus();
    } else {
      gsap.to(window, {
        duration: 0.7,
        scrollTo: { y: guideEl, offsetY: 20 },
        ease: 'power2.out',
        onComplete: () => {
          const heading = guideEl.querySelector('h2');
          if (heading) heading.focus();
        }
      });
    }
  };

  if (typeof window !== 'undefined' && window.location.pathname !== '/') {
    return null;
  }

  return (
    <button
      className={styles.triggerBtn}
      onClick={handleScrollToGuide}
      aria-label={t('pageGuide.title')}
    >
      <HelpCircle size={13} />
      <span>{t('pageGuide.title')}</span>
    </button>
  );
};

// ─── MAIN GUIDEBOOK LAYOUT COMPONENT ─────────────────────────────────────────
interface PageGuidebookProps {
  guideKey: keyof typeof pageGuides;
}

export const PageGuidebook: React.FC<PageGuidebookProps> = ({ guideKey }) => {
  const guide = pageGuides[guideKey];
  const guidebookRef = useRef<HTMLDivElement>(null);

  const handleBackToPage = (e: React.MouseEvent) => {
    e.preventDefault();
    const mainHeader = document.querySelector('header') || document.body;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      mainHeader.scrollIntoView({ behavior: 'auto' });
    } else {
      gsap.to(window, {
        duration: 0.6,
        scrollTo: { y: mainHeader, offsetY: 20 },
        ease: 'power2.out'
      });
    }
  };

  useEffect(() => {
    // Check if Guidebook component is present on viewport scroll trigger
    const current = guidebookRef.current;
    if (!current) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      // Set opacity immediately
      gsap.set(current.querySelectorAll('.guide-stagger'), { opacity: 1, y: 0 });
      return;
    }

    // Set initial states for entrance animations
    gsap.set(current.querySelectorAll('.guide-stagger'), { opacity: 0, y: 15 });

    const scrollTriggerObj = ScrollTrigger.create({
      trigger: current,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        gsap.to(current.querySelectorAll('.guide-stagger'), {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.08,
          ease: 'power2.out'
        });
      }
    });

    return () => {
      scrollTriggerObj.kill();
    };
  }, [guideKey]);

  if (!guide || guideKey !== 'home') return null;

  return (
    <section
      id="page-guidebook"
      ref={guidebookRef}
      className={styles.guidebook}
      aria-labelledby="guide-title-id"
    >
      <div className={`${styles.guidebookHeader} guide-stagger`}>
        <span className={styles.guidebookEyebrow}>Operational Field Guide</span>
        <h2 id="guide-title-id" tabIndex={-1} className={styles.guidebookTitle}>
          {guide.title}
        </h2>
        <p className={styles.guidebookIntro}>{guide.intro}</p>
      </div>

      <div className={styles.guidebookGrid}>
        {/* Left Column: Flow steps */}
        <div className={`${styles.stepsSection} guide-stagger`}>
          {guide.howToUse.map((s, idx) => (
            <div key={idx} className={styles.stepRow}>
              <span className={styles.stepNum}>{String(idx + 1).padStart(2, '0')}</span>
              <div className={styles.stepText}>
                <h4>{s.step}</h4>
                <p>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Right Column: Roles & Rationale */}
        <div className={`${styles.sidebarSection} guide-stagger`}>
          <div className={styles.sidebarCard}>
            <h4>Why It Exists</h4>
            <p>{guide.whyExists}</p>
          </div>

          <div className={styles.sidebarCard}>
            <h4>Primary Audience</h4>
            <ul>
              {guide.whoIsItFor.map((role, idx) => (
                <li key={idx}>{role}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Reusable Workflow Flow Diagrams */}
      {guide.workflow && guide.workflow.length > 0 && (
        <div className={`${styles.flowDiagramSection} guide-stagger`}>
          <span className={styles.flowTitle}>THE SYSTEM LIFECYCLE TARGET FLOW</span>
          <div className={styles.flowPath}>
            {guide.workflow.map((node, idx) => (
              <React.Fragment key={idx}>
                <span className={styles.flowNode}>{node}</span>
                {idx < guide.workflow.length - 1 && (
                  <span className={styles.flowArrow} aria-hidden="true">→</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Reusable Glossary items for common terminology */}
      <div className={`${styles.glossarySection} guide-stagger`}>
        <span className={styles.flowTitle}>Key Terms Glossary</span>
        <div className={styles.glossaryList}>
          {Object.values(GLOSSARY).map((g, idx) => (
            <div key={idx} className={styles.glossaryTerm}>
              <strong>{g.term}</strong>
              <span>{g.definition}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Operational guidelines alert */}
      <div className="guide-stagger" style={{ marginTop: '24px', fontSize: '12px', borderLeft: '3px solid #F47C20', paddingLeft: '12px', fontStyle: 'italic', color: 'rgba(23,33,28,0.6)' }}>
        <strong>Important:</strong> {guide.importantRules}
      </div>

      {/* Back to top toggle */}
      <div className={`${styles.backToTop} guide-stagger`}>
        <button
          className={styles.backBtn}
          onClick={handleBackToPage}
          aria-label="Back to main page content"
        >
          <ArrowUp size={11} style={{ marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }} />
          <span>Back To Page ↑</span>
        </button>
      </div>
    </section>
  );
};

export default PageGuidebook;
