/**
 * Deterministic, static Grove prototype catalog.
 * These are starter templates, NOT LLM outputs, researched market opportunities,
 * launch-ready products, verified measurements or certified guidance.
 */
export const CATALOG=Object.freeze([
  {title:'Printable maintenance checklist',audience:'People maintaining bicycles',type:'checklist',
   sections:[
    ['Before a normal ride','Look over tires for visible cuts or embedded debris','Confirm both brakes respond before setting off','Check for obvious loose accessories and unusual noises'],
    ['Maintenance log','Record the date and bike model','List maintenance checks actually performed','Note any problem requiring manufacturer guidance or a bicycle mechanic'],
    ['Follow-up','Identify the next inspection date','Record where you found the applicable manufacturer instructions','Write one unresolved mechanical question']
   ]},
  {title:'Simple project planning sheet',audience:'Students building their first project',type:'worksheet',
   sections:[
    ['Project definition','State what the project will create','List the resources you already have','Define one small finishable first milestone'],
    ['Build steps','Break the milestone into three manageable tasks','Estimate the time you can realistically set aside','Record obstacles and what information is missing'],
    ['Review','Record what is actually complete','Describe one thing that did not work as planned','Choose the next small task']
   ]},
  {title:'Mountain-bike trail prep guide',audience:'New local trail riders',type:'checklist',
   sections:[
    ['Research your trail','Check the official trail rules and current access notices','Record the location and difficulty of your intended route','Confirm whether weather or closures affect trail access'],
    ['Prepare to ride','Inspect bike brakes and tires according to manufacturer guidance','Pack water and a suitable protective helmet','Tell a trusted person where you plan to ride'],
    ['Respect the trails','Follow posted yielding and speed guidance','Avoid closed or damaged trails','Record one condition that should be reported to trail staff']
   ]},
  {title:'Small-business inventory tracker',audience:'Very small local sellers',type:'inventory',
   sections:[
    ['Set up items','Give each item a distinct identifier','Enter current counted quantity without guessing','Choose a restock threshold appropriate to the item'],
    ['Daily checks','Record counted stock changes as they happen','Mark items at or below their chosen threshold','Review discrepancies against a physical count'],
    ['Review','List which items need follow-up','Date the last inventory count','Keep customer or payment details out of this template']
   ]},
  {title:'Piano practice journal',audience:'Beginner piano learners',type:'worksheet',
   sections:[
    ['Choose a session','Write the piece or exercise you plan to practice','Choose a small musical passage to focus on','Set a reasonable session goal'],
    ['Reflect on practice','Record one passage that improved with repetition','Identify one rhythm or fingering question','Note a technique suggestion from your teacher'],
    ['Plan the next session','Choose a passage to revisit','Write down a question you want to ask','Reflect on enjoyment and musical expression']
   ]},
  {title:'Yard project material estimator',audience:'People planning a garden project',type:'yard-calculator',
   sections:[
    ['Measure the project','Measure rectangular surface length and width in feet','Estimate planned material depth in inches','Split irregular projects into measurable rectangles'],
    ['Calculate an estimate','Convert thickness from inches into feet','Multiply the surface area by depth for cubic feet','Divide by 27 to estimate cubic yards'],
    ['Before ordering','Allow for actual site conditions and compaction differences','Confirm supplier measurement and minimum quantity rules','Do not treat this simplified geometric estimate as an exact order']
   ]},
  {title:'Volunteer event planning pack',audience:'Small community groups',type:'worksheet',
   sections:[
    ['Plan the event','Describe the purpose and intended participants','Choose a suitable date, place and backup plan','List the tasks that need volunteers'],
    ['Coordinate safely','Ask for voluntary role commitments','Clarify accessibility and safeguarding needs with organizers','Prepare a simple check-in and contact procedure'],
    ['After the event','Document what actually happened','Record supply or schedule problems without personal details','Note a change that would improve a later event']
   ]},
  {title:'Beginner CAD parts library',audience:'Students learning 3D modeling',type:'cad',
   sections:[
    ['Practice shape 1','Sketch a rectangular plate from stated dimensions','Add a centered circular hole with a dimension constraint','Export a drawing and review the measured dimensions'],
    ['Practice shape 2','Sketch a simple L bracket using separate straight edges','Apply consistent thickness and check overlapping regions','Check units before exporting an original practice model'],
    ['Review','Keep a record of each part version and dimensions','Inspect the exported result in a compatible viewer','Do not assume these learning sketches are structural engineering designs']
   ]},
  {title:'Study session planner',audience:'Students organizing assignments',type:'worksheet',
   sections:[
    ['Collect your tasks','List assignments and their actual due dates','Break one large assignment into shorter steps','Identify materials needed before starting'],
    ['Plan a session','Choose a task that fits your available time','Write the goal of this specific study block','Include a reasonable pause before another block'],
    ['Review','Record which tasks were really completed','Reschedule unfinished tasks without hiding them','Choose the next priority using deadline and difficulty']
   ]},
  {title:'Budget-free business experiment worksheet',audience:'New entrepreneurs',type:'worksheet',
   sections:[
    ['Define an honest hypothesis','Describe a specific problem a person might have','Record what would count as useful evidence','Explain why the proposed no-cost prototype might help'],
    ['Run a responsible test','Draft a prototype using original materials','Ask a consenting person for voluntary non-identifying feedback','Record negative comments and unanswered questions'],
    ['Decide with evidence','Separate guesses from observations you can substantiate','Write a concrete revision or retirement decision','Check eligibility and obtain separate authorization before public selling']
   ]},
  {title:'Home organization labels',audience:'Households organizing storage',type:'labels',
   sections:[
    ['Choose categories','Group containers by what they actually hold','Write clear category names that are easy to recognize','Keep labels free of private contact or financial information'],
    ['Print and check','Print a test sheet at 100 percent scale','Check whether the label fits its container','Use a readable marker or printer without shrinking text too far'],
    ['Revise','Remove labels that are misleading or hard to read','Use consistent terms for related categories','Test labels on one container before printing many']
   ]},
  {title:'Open-source project changelog template',audience:'Hobby software builders',type:'changelog',
   sections:[
    ['Prepare a release note','Record the exact version and release date','Summarize added features without exaggeration','Describe important fixed bugs with observable effects'],
    ['Track compatibility','Describe any changed configuration or migration steps','Link to issues only after confirming their relevance','Review license and dependency notices from official sources'],
    ['Verify the record','Compare each claim to the actual repository diff','Mark any known limitation or unresolved issue','Keep the entry as a draft until reviewed by a maintainer']
   ]}
]);
