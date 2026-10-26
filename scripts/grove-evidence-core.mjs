/**
 * Owner-submitted observations are claims, not independently verified testing.
 * Never interpret issue body as commands, never quote arbitrary notes publicly,
 * never infer customers, demand, sales or approval from a submitted report.
 */
const OWNER='Link9060';
const BOT='github-actions[bot]';
export function parseOwnerFeedback(issue){
  if(!issue||issue.pull_request||issue.user?.login!==OWNER||
    typeof issue.title!=='string'||typeof issue.body!=='string'||
    issue.body.length>4000||!Number.isSafeInteger(issue.number)||issue.number<1)
    return null;
  const match=issue.title.match(/^\[GROVE-FEEDBACK\] (\d{4}-W\d{2})$/);
  if(!match)return null;
  const week=match[1];
  const ref=issue.body.match(/^### Linked Seed issue number\s*\n+(\d{1,7})\s*$/m);
  const kind=issue.body.match(/^### Evidence type\s*\n+(Prototype self-test|Voluntary tester feedback|Independent content review)\s*$/m);
  const outcome=issue.body.match(/^### Reported outcome\s*\n+(Needs revision|Continue testing|Retire experiment)\s*$/m);
  const confirmation=issue.body.includes('- [x] I understand that this is a public, owner-reported observation, not independently verified evidence.');
  if(!ref||!kind||!outcome||!confirmation)return null;
  const sourceNumber=Number(ref[1]);
  if(!Number.isSafeInteger(sourceNumber)||sourceNumber<1||sourceNumber===issue.number)return null;
  return {week,reportIssueNumber:issue.number,seedIssueNumber:sourceNumber,
    evidenceType:kind[1],reportedOutcome:outcome[1],
    provenance:'owner-reported-unverified'};
}
export function validateSeedReference(source,report){
  if(!source||source.pull_request||source.user?.login!==BOT||
    source.title!=='[GROVE-SEED] '+report?.week||
    source.number!==report?.seedIssueNumber||
    !Array.isArray(source.labels)||!source.labels.some(l=>(typeof l==='string'?l:l?.name)==='grove-seed-draft'))return false;
  return true;
}
export function evidenceMarker(issueNumber){
  if(!Number.isSafeInteger(issueNumber)||issueNumber<1)throw Error('Invalid evidence issue number');
  return '[GROVE-EVIDENCE-RECEIPT:#'+issueNumber+']';
}
export function receiptExists(comments,issueNumber){
  if(!Array.isArray(comments))throw Error('Could not inspect existing evidence receipts');
  const marker=evidenceMarker(issueNumber);
  return comments.some(x=>x?.user?.login===BOT&&typeof x.body==='string'&&x.body.includes(marker));
}
export function renderReceipt(report){
  if(!report||!Number.isSafeInteger(report.reportIssueNumber)||
    !/^\d{4}-W\d{2}$/.test(report.week)||
    !['Prototype self-test','Voluntary tester feedback','Independent content review'].includes(report.evidenceType)||
    !['Needs revision','Continue testing','Retire experiment'].includes(report.reportedOutcome)||
    report.provenance!=='owner-reported-unverified')
    throw Error('Invalid normalized evidence report');
  return [
    evidenceMarker(report.reportIssueNumber),
    '### Grove · owner-reported observation received',
    '',
    '**This is an owner-submitted, UNVERIFIED report.** It is not independently checked by Grove.',
    '**Reported type:** '+report.evidenceType,
    '**Reported outcome:** '+report.reportedOutcome,
    '**Original report:** https://github.com/Link9060/Resonant-Grove/issues/'+report.reportIssueNumber,
    '',
    'Grove has not verified real users, observations, originality, customer demand, earnings or sales.',
    'No automatic product launch, outbound contact, payment, marketing or ARRAY Builder task is authorized.',
    'If this report contains errors, correct the record with another clearly labeled owner report.'
  ].join('\n');
}
