/** A dependency-free observability platform with pluggable exporters and in-memory storage. */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
export type MetricKind = 'counter' | 'gauge' | 'histogram';
export interface TelemetryEvent { id: string; type: string; timestamp: number; source?: string; attributes: Record<string, unknown>; }
export interface SpanRecord extends TelemetryEvent { traceId: string; spanId: string; parentSpanId?: string; name: string; durationMs?: number; status: 'unset'|'ok'|'error'; }
export interface MetricRecord { name: string; kind: MetricKind; value: number; timestamp: number; labels: Record<string,string>; }
export interface AlertRule { id: string; name: string; metric: string; operator: '>'|'<'|'='|'>='|'<='; threshold: number; severity?: LogLevel; }
export interface Alert { id: string; ruleId: string; state: 'firing'|'resolved'; value: number; timestamp: number; message: string; }
export interface HealthResult { status: 'healthy'|'degraded'|'unhealthy'; checks: Record<string,{status:'healthy'|'unhealthy'; latencyMs:number; message?:string}>; timestamp:number; }
const id = () => crypto.randomUUID();

export class TelemetryManager {
  readonly events: TelemetryEvent[] = [];
  constructor(private readonly maxEvents = 10000) {}
  record(type: string, attributes: Record<string, unknown> = {}, source?: string): TelemetryEvent { const event={id:id(),type,timestamp:Date.now(),source,attributes}; this.events.push(event); if(this.events.length>this.maxEvents)this.events.shift(); return event; }
  query(type?: string, since?: number): TelemetryEvent[] { return this.events.filter(e=>(!type||e.type===type)&&(!since||e.timestamp>=since)); }
}
export class MetricsManager {
  readonly metrics: MetricRecord[]=[];
  record(name:string,value:number,kind:MetricKind='gauge',labels:Record<string,string>={}):MetricRecord { const m={name,value,kind,labels,timestamp:Date.now()}; this.metrics.push(m); return m; }
  increment(name:string, value=1, labels={}) { return this.record(name,value,'counter',labels); }
  snapshot() { const out:Record<string,{value:number;count:number;kind:MetricKind}>={}; for(const m of this.metrics){const k=m.name; const x=out[k]??={value:0,count:0,kind:m.kind}; x.value=m.kind==='counter'?x.value+m.value:m.value; x.count++;} return out; }
}
export class TracingManager {
  readonly spans: SpanRecord[]=[];
  start(name:string, attributes:Record<string,unknown>={}, parent?:SpanRecord):SpanRecord { return {id:id(),type:'span',timestamp:Date.now(),traceId:parent?.traceId??id(),spanId:id(),parentSpanId:parent?.spanId,name,attributes,status:'unset'}; }
  end(span:SpanRecord,status:'ok'|'error'='ok'):SpanRecord { span.durationMs=Date.now()-span.timestamp; span.status=status; this.spans.push(span); return span; }
  async run<T>(name:string, fn: (span:SpanRecord)=>Promise<T>, parent?:SpanRecord):Promise<T> { const span=this.start(name,{},parent); try { const result=await fn(span); this.end(span); return result; } catch(e){this.end(span,'error');throw e;} }
}
export class AlertManager {
  readonly rules=new Map<string,AlertRule>(); readonly alerts:Alert[]=[];
  addRule(rule:AlertRule){this.rules.set(rule.id,rule);return rule;} removeRule(id:string){return this.rules.delete(id);}
  evaluate(name:string,value:number):Alert[]{const result:Alert[]=[]; for(const r of this.rules.values()){if(r.metric!==name)continue; const hit=r.operator==='>'?value>r.threshold:r.operator==='<'?value<r.threshold:r.operator==='='?value===r.threshold:r.operator==='>='?value>=r.threshold:value<=r.threshold; if(hit){const a={id:id(),ruleId:r.id,state:'firing' as const,value,timestamp:Date.now(),message:`${r.name}: ${name}=${value}`};this.alerts.push(a);result.push(a);}} return result;}
}
export class DiagnosticManager { diagnose(error:unknown, context:Record<string,unknown>={}) { return {id:id(),timestamp:Date.now(),message:error instanceof Error?error.message:String(error),stack:error instanceof Error?error.stack:undefined,context}; } }
export class HealthManager {
  private checks=new Map<string,()=>Promise<boolean>|boolean>(); register(name:string,check:()=>Promise<boolean>|boolean){this.checks.set(name,check);return this;}
  async check():Promise<HealthResult>{const checks:HealthResult['checks']={}; for(const [name,fn] of this.checks){const start=performance.now();try{const ok=await fn();checks[name]={status:ok?'healthy':'unhealthy',latencyMs:performance.now()-start};}catch(e){checks[name]={status:'unhealthy',latencyMs:performance.now()-start,message:e instanceof Error?e.message:String(e)};}} const values=Object.values(checks); const good=values.filter(x=>x.status==='healthy').length; return {status:good===values.length?'healthy':good?'degraded':'unhealthy',checks,timestamp:Date.now()};}
}
export class AuditManager { readonly records:TelemetryEvent[]=[]; record(action:string, actor?:string, details:Record<string,unknown>={}){const event={id:id(),type:'audit',timestamp:Date.now(),source:actor,attributes:{action,...details}};this.records.push(event);return event;} }
export class AnalyticsManager { constructor(private readonly telemetry:TelemetryManager, private readonly metrics:MetricsManager){} summary(){return {events:this.telemetry.events.length,metrics:this.metrics.metrics.length,metricSnapshot:this.metrics.snapshot()};} }
export class ObservabilityPlatform { readonly telemetry=new TelemetryManager(); readonly metrics=new MetricsManager(); readonly tracing=new TracingManager(); readonly alerts=new AlertManager(); readonly diagnostics=new DiagnosticManager(); readonly health=new HealthManager(); readonly audit=new AuditManager(); readonly analytics=new AnalyticsManager(this.telemetry,this.metrics); }
export class LoggingManager {
  readonly entries:Array<{level:LogLevel;message:string;timestamp:number;context:Record<string,unknown>}> = [];
  log(level:LogLevel,message:string,context:Record<string,unknown>={}) { const entry={level,message,timestamp:Date.now(),context}; this.entries.push(entry); return entry; }
  trace(m:string,c={}){return this.log('trace',m,c)} debug(m:string,c={}){return this.log('debug',m,c)} info(m:string,c={}){return this.log('info',m,c)} warn(m:string,c={}){return this.log('warn',m,c)} error(m:string,c={}){return this.log('error',m,c)} fatal(m:string,c={}){return this.log('fatal',m,c)}
}
