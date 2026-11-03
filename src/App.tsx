import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  BarChart3,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  Download,
  Eraser,
  Eye,
  FileText,
  Gauge,
  GitBranch,
  Info,
  Layers,
  Lightbulb,
  Network,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Save,
  Settings2,
  Shield,
  Sparkles,
  StepForward,
  Trash2,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { motion, AnimatePresence } from 'framer-motion';
import { GraphCanvas, COMPONENT_COLORS, type InteractionMode } from '@/components/GraphCanvas';
import {
  computeResilience,
  describeImpact,
  runAlgorithm,
  suggestRemediation,
  type AlgorithmResult,
  type AlgorithmStep,
  type GraphModel,
} from '@/engine/algorithm';
import { cloneGraph, getPresetGraphs, type PresetGraph } from '@/engine/presets';
import { defaultDomainGraph, domainTemplates, getDomain, iconForNode } from '@/engine/domains';

type AppMode = 'learning' | 'real-world';
type EntryView = 'landing' | 'app';

const presets = getPresetGraphs();
const DEFAULT_GRAPH = cloneGraph(presets[2].graph);

function App() {
  const [entryView, setEntryView] = useState<EntryView>('landing');
  const [mode, setMode] = useState<AppMode>('learning');

  const enterMode = (next: AppMode) => {
    setMode(next);
    setEntryView('app');
  };

  return (
    <div className="min-h-full bg-canvas">
      {entryView === 'landing' ? <Landing onSelect={enterMode} /> : (
        <AppShell mode={mode} onModeChange={setMode} onHome={() => setEntryView('landing')} />
      )}
    </div>
  );
}

function Landing({ onSelect }: { onSelect: (mode: AppMode) => void }) {
  return (
    <main className="h-screen bg-navy flex items-center justify-center px-6 py-12 relative overflow-y-auto">
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, #3FA7B8 0, transparent 32%), radial-gradient(circle at 80% 85%, #FF6B35 0, transparent 28%)' }} />
      <div className="relative z-10 w-full max-w-5xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 text-teal-light mb-5">
            <Shield size={22} />
            <span className="text-sm font-semibold tracking-[0.2em] uppercase">GraphGuard</span>
          </div>
          <h1 className="font-serif text-5xl md:text-6xl font-semibold text-white leading-tight">See where your network<br /><span className="text-teal-light">can break.</span></h1>
          <p className="text-muted-dark max-w-2xl mx-auto mt-6 text-[17px] leading-relaxed">Explore the graph algorithm that finds single points of failure — then apply it to the systems you care about.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">
          <ModeCard icon={BookOpen} eyebrow="LEARN THE ALGORITHM" title="Learning Mode" subtitle="For students & teachers — watch the algorithm think" accent="teal" onClick={() => onSelect('learning')} />
          <ModeCard icon={Network} eyebrow="PROTECT YOUR SYSTEM" title="Real-World Mode" subtitle="For organizations — find the weak point in your network" accent="orange" onClick={() => onSelect('real-world')} />
        </div>
        <div className="flex items-center justify-center gap-2 mt-9 text-muted-dark/70 text-xs">
          <Sparkles size={14} /> Runs entirely in your browser · No account required
        </div>
      </div>
    </main>
  );
}

function ModeCard({ icon: Icon, eyebrow, title, subtitle, accent, onClick }: { icon: typeof BookOpen; eyebrow: string; title: string; subtitle: string; accent: 'teal' | 'orange'; onClick: () => void }) {
  const orange = accent === 'orange';
  return (
    <motion.button whileHover={{ y: -5 }} whileTap={{ scale: 0.98 }} onClick={onClick} className="group text-left bg-white/10 border border-white/15 hover:border-white/35 rounded-2xl p-7 transition-all duration-300 shadow-2xl backdrop-blur-sm">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-7 ${orange ? 'bg-orange text-white' : 'bg-teal-light text-navy'}`}><Icon size={24} /></div>
      <div className="text-xs font-bold tracking-[0.17em] text-teal-light mb-3">{eyebrow}</div>
      <h2 className="font-serif text-3xl font-semibold text-white mb-3">{title}</h2>
      <p className="text-muted-dark leading-relaxed">{subtitle}</p>
      <div className="mt-7 flex items-center gap-2 text-white text-sm font-semibold group-hover:gap-3 transition-all">Enter mode <span>→</span></div>
    </motion.button>
  );
}

function AppShell({ mode, onModeChange, onHome }: { mode: AppMode; onModeChange: (mode: AppMode) => void; onHome: () => void }) {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <header className="bg-navy text-white sticky top-0 z-40 shadow-lg shrink-0">
        <div className="max-w-[1500px] mx-auto px-5 lg:px-8 h-[72px] flex items-center justify-between">
          <button onClick={onHome} className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-teal flex items-center justify-center group-hover:bg-teal-light transition-colors"><Shield size={20} /></div>
            <div className="text-left"><div className="font-serif font-semibold text-xl leading-none">GraphGuard</div><div className="text-[10px] text-muted-dark tracking-wider uppercase mt-1">Network resilience lab</div></div>
          </button>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-xs text-muted-dark">Explore with</span>
            <div className="bg-navy-700 p-1 rounded-full border border-white/10 flex items-center">
              <button onClick={() => onModeChange('learning')} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${mode === 'learning' ? 'bg-teal text-white shadow' : 'text-muted-dark hover:text-white'}`}>Learning</button>
              <button onClick={() => onModeChange('real-world')} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${mode === 'real-world' ? 'bg-orange text-white shadow' : 'text-muted-dark hover:text-white'}`}>Real-World</button>
            </div>
          </div>
        </div>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <AnimatePresence mode="wait">
          {mode === 'learning' ? (
            <motion.div
              key="learning"
              className="h-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <LearningMode />
            </motion.div>
          ) : (
            <motion.div
              key="realworld"
              className="h-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <RealWorldMode />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function LearningMode() {
  const [graph, setGraph] = useState<GraphModel>(DEFAULT_GRAPH);
  const [selectedPreset, setSelectedPreset] = useState('figure8');
  const [startVertex, setStartVertex] = useState(DEFAULT_GRAPH.vertices[0]?.id ?? '');
  const [interaction, setInteraction] = useState<InteractionMode>('view');
  const [result, setResult] = useState<AlgorithmResult | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [buggyMode, setBuggyMode] = useState<'none' | 'skip-parent-check' | 'strict-greater'>('none');
  const [quiz, setQuiz] = useState(false);
  const [showBlockCut, setShowBlockCut] = useState(false);
  const [explainOpen, setExplainOpen] = useState(true);
  const [rootDemo, setRootDemo] = useState<'root1' | 'root2'>('root2');

  const currentStep = result?.steps[stepIndex] ?? null;
  const isFinished = !!result && stepIndex === result.steps.length - 1;

  useEffect(() => {
    if (!playing || !result) return;
    if (stepIndex >= result.steps.length - 1) { setPlaying(false); return; }
    const timer = window.setTimeout(() => setStepIndex((i) => Math.min(i + 1, result.steps.length - 1)), 1050 / speed);
    return () => window.clearTimeout(timer);
  }, [playing, result, stepIndex, speed]);

  const loadPreset = (id: string) => {
    const preset = presets.find((p) => p.id === id) ?? presets[0];
    setSelectedPreset(id);
    const next = cloneGraph(preset.graph);
    setGraph(next);
    setStartVertex(next.vertices.find((v) => v.label === preset.graph.vertices[0]?.label)?.id ?? next.vertices[0]?.id ?? '');
    setResult(null); setStepIndex(0); setPlaying(false); setShowBlockCut(false);
  };

  const run = () => {
    if (!startVertex || graph.vertices.length === 0) return;
    setResult(runAlgorithm(graph, startVertex, { buggyMode }));
    setStepIndex(0); setPlaying(false); setShowBlockCut(false);
  };

  const reset = () => { setResult(null); setStepIndex(0); setPlaying(false); setShowBlockCut(false); };
  const step = (delta: number) => { if (!result) run(); else setStepIndex((i) => Math.max(0, Math.min(result.steps.length - 1, i + delta))); };
  const displayStep: AlgorithmStep = currentStep ?? { index: 0, kind: 'start', disc: {}, low: {}, parent: {}, visited: [], treeEdges: [], backEdges: [], edgeStack: [], articulationPoints: [], components: [], currentVertex: null, currentEdge: null, description: 'Run the algorithm to see its decisions unfold.', rootChildrenCount: 0 };
  const componentOverlays = displayStep.components.map((c, i) => ({ id: c.id, vertices: c.vertices, color: COMPONENT_COLORS[i % COMPONENT_COLORS.length] }));

  return (
    <main className="h-full max-w-[1500px] mx-auto px-4 lg:px-8 py-3">


      <div className="grid h-full min-h-0 xl:grid-cols-[260px_minmax(500px,1fr)_330px] gap-4 items-stretch">
        <LearningSidebar selectedPreset={selectedPreset} loadPreset={loadPreset} graph={graph} setGraph={setGraph} interaction={interaction} setInteraction={setInteraction} startVertex={startVertex} setStartVertex={setStartVertex} buggyMode={buggyMode} setBuggyMode={setBuggyMode} quiz={quiz} setQuiz={setQuiz} rootDemo={rootDemo} setRootDemo={setRootDemo} />
        <section className="h-full min-w-0 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-card overflow-hidden border border-slate-100">

            <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-navy">DFS visualization</h2>
                <p className="text-xs text-muted-light mt-1">
                  {graph.vertices.length} vertices · {graph.edges.length} connections
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-lg bg-slate-100 p-1">
                  <button
                    onClick={() => {
                      setRootDemo('root1');
                      loadPreset('root1');
                    }}
                    className={`px-3 py-1.5 text-[11px] rounded-md font-semibold ${rootDemo === 'root1'
                        ? 'bg-white text-teal shadow-sm'
                        : 'text-muted-light'
                      }`}
                  >
                    1 child
                  </button>
                  <button
                    onClick={() => {
                      setRootDemo('root2');
                      loadPreset('root2');
                    }}
                    className={`px-3 py-1.5 text-[11px] rounded-md font-semibold ${rootDemo === 'root2'
                        ? 'bg-white text-orange shadow-sm'
                        : 'text-muted-light'
                      }`}
                  >
                    2 children
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setShowBlockCut(false)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${!showBlockCut
                        ? 'bg-teal text-white'
                        : 'bg-slate-100 text-muted-light'
                      }`}
                  >
                    Graph view
                  </button>
                  <button
                    disabled={!result}
                    onClick={() => setShowBlockCut(true)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${showBlockCut
                        ? 'bg-orange text-white'
                        : 'bg-slate-100 text-muted-light disabled:opacity-50'
                      }`}
                  >
                    Block-cut tree
                  </button>
                </div>
              </div>
            </div>

            <div className="h-[250px]"><GraphCanvas graph={graph} onChange={setGraph} interaction={interaction} readOnly={!!result || showBlockCut} highlightVertex={displayStep.currentVertex} articulationPoints={displayStep.articulationPoints} treeEdges={displayStep.treeEdges} backEdges={displayStep.backEdges} visitedVertices={displayStep.visited} currentEdge={displayStep.currentEdge} edgeStack={displayStep.edgeStack} components={componentOverlays} blockCutMode={showBlockCut} blockCutNodes={result?.blockCutTree.nodes} blockCutLinks={result?.blockCutTree.links} /></div>
            <PlaybackControls result={result} stepIndex={stepIndex} playing={playing} setPlaying={setPlaying} onStep={(d) => step(d)} onReset={reset} speed={speed} setSpeed={setSpeed} onRun={run} />
          </div>

          <div className="bg-white rounded-xl shadow-card mt-2 border border-slate-100 overflow-hidden">
            <button
              onClick={() => setExplainOpen(!explainOpen)}
              className="w-full px-3 py-2 flex items-center justify-between text-left"
            >
              <span className="flex items-center gap-2 font-semibold text-navy text-sm">
                <Lightbulb size={16} className="text-orange" />
                Explain this step
              </span>
              <ChevronDown
                size={16}
                className={`text-muted-light transition-transform ${explainOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {explainOpen && (
              <div className="px-3 pb-3 animate-fade-up">
                <div className="rounded-lg bg-teal/5 border border-teal/15 p-3 text-xs leading-relaxed text-navy">
                  {displayStep.description}
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-light">
                  <span className="font-semibold text-teal">
                    Step {result ? stepIndex + 1 : 0} of {result?.steps.length ?? 0}
                  </span>

                  {displayStep.kind === 'back-edge' && (
                    <span className="px-2 py-1 rounded-full bg-orange/10 text-orange font-semibold">
                      Back edge found
                    </span>
                  )}

                  {displayStep.kind === 'close-component' && (
                    <span className="px-2 py-1 rounded-full bg-teal/10 text-teal font-semibold">
                      Component closed
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

        </section>
        <LearningInspector result={result} step={displayStep} graph={graph} quiz={quiz} isFinished={isFinished} buggyMode={buggyMode} />
      </div>
    </main>
  );
}

function LearningSidebar({ selectedPreset, loadPreset, graph, setGraph, interaction, setInteraction, startVertex, setStartVertex, buggyMode, setBuggyMode, quiz, setQuiz, rootDemo, setRootDemo }: { selectedPreset: string; loadPreset: (id: string) => void; graph: GraphModel; setGraph: (g: GraphModel) => void; interaction: InteractionMode; setInteraction: (m: InteractionMode) => void; startVertex: string; setStartVertex: (s: string) => void; buggyMode: 'none' | 'skip-parent-check' | 'strict-greater'; setBuggyMode: (m: 'none' | 'skip-parent-check' | 'strict-greater') => void; quiz: boolean; setQuiz: (v: boolean) => void; rootDemo: 'root1' | 'root2'; setRootDemo: (v: 'root1' | 'root2') => void }) {
  return <aside className="space-y-2">

    <Panel title="Choose a graph" icon={Layers}>
      <select
        value={selectedPreset}
        onChange={(e) => loadPreset(e.target.value)}
        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-navy outline-none focus:border-teal"
      >
        {presets.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      <p className="text-[11px] leading-snug text-muted-light mt-1.5">
        {presets.find((p) => p.id === selectedPreset)?.description}
      </p>
    </Panel>


    <Panel title="Graph builder" icon={Settings2}>
      <p className="text-[11px] text-muted-light leading-snug mb-2">
        Add vertices, connect them, or drag to reposition. Right-click removes an item.
      </p>

      <div className="grid grid-cols-2 gap-1.5">
        <ToolButton active={interaction === 'add-vertex'} onClick={() => setInteraction(interaction === 'add-vertex' ? 'view' : 'add-vertex')} icon={Plus} label="Add node" />
        <ToolButton active={interaction === 'connect'} onClick={() => setInteraction(interaction === 'connect' ? 'view' : 'connect')} icon={GitBranch} label="Connect" />
        <ToolButton active={interaction === 'delete'} onClick={() => setInteraction(interaction === 'delete' ? 'view' : 'delete')} icon={Trash2} label="Delete" />
        <ToolButton active={interaction === 'view'} onClick={() => setInteraction('view')} icon={Eye} label="Move / view" />
      </div>

      <div className="mt-2 pt-2 border-t border-slate-100">
        <label className="text-[11px] font-semibold text-navy">Start DFS at</label>
        <select
          value={startVertex}
          onChange={(e) => setStartVertex(e.target.value)}
          className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-navy"
        >
          {graph.vertices.map((v) => (
            <option value={v.id} key={v.id}>{v.label}</option>
          ))}
        </select>
      </div>
    </Panel>

    <Panel title="Teaching tools" icon={CircleHelp}><Toggle label="Predict before reveal" value={quiz} onChange={setQuiz} /><div className="mt-3"><label className="text-xs font-semibold text-navy">Buggy algorithm</label><select value={buggyMode} onChange={(e) => setBuggyMode(e.target.value as typeof buggyMode)} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs text-navy"><option value="none">Off — correct algorithm</option><option value="skip-parent-check">Skip parent-edge check</option><option value="strict-greater">Use &gt; instead of ≥</option></select></div></Panel>

  </aside>;
}

function LearningInspector({ result, step, graph, quiz, isFinished, buggyMode }: { result: AlgorithmResult | null; step: AlgorithmStep; graph: GraphModel; quiz: boolean; isFinished: boolean; buggyMode: string }) {
  const [answer, setAnswer] = useState('');
  const [revealed, setRevealed] = useState(!quiz);
  useEffect(() => { setRevealed(!quiz); setAnswer(''); }, [step.index, quiz]);
  const finish = isFinished && result;
  return <aside className="space-y-2">
    {quiz && step.currentVertex && !revealed && <div className="bg-navy rounded-xl p-5 text-white shadow-card animate-fade-up"><div className="flex items-center gap-2 text-teal-light text-xs font-bold tracking-wider uppercase"><CircleHelp size={15} /> Pause & predict</div><h3 className="font-serif text-xl mt-3">Is “{graph.vertices.find((v) => v.id === step.currentVertex)?.label}” an articulation point?</h3><p className="text-muted-dark text-xs mt-2">What evidence would you look for in disc[] and low[]?</p><textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Write your reasoning…" className="w-full mt-4 bg-white/10 border border-white/20 rounded-lg p-3 text-sm text-white placeholder:text-muted-dark/70 outline-none focus:border-teal-light" rows={3} /><button onClick={() => setRevealed(true)} className="w-full mt-3 bg-teal-light text-navy font-semibold rounded-lg py-2 text-sm hover:bg-white transition-colors">Reveal answer</button></div>}
    <Panel title="Live values" icon={BarChart3}><div className="grid grid-cols-[1fr_60px_60px] text-[11px] font-semibold text-muted-light border-b border-slate-100 pb-2 mb-1"><span>Vertex</span><span className="text-center">disc</span><span className="text-center">low</span></div>{graph.vertices.map((v) => { const current = step.currentVertex === v.id; const ap = step.articulationPoints.includes(v.id); return <div key={v.id} className={`grid grid-cols-[1fr_60px_60px] items-center py-2 text-xs rounded ${current ? 'bg-teal/10' : ''}`}><span className={`font-semibold truncate ${ap ? 'text-orange' : 'text-navy'}`}>{v.label}{ap && <span className="ml-1 text-[9px]">●</span>}</span><span className="text-center font-mono text-muted-light">{step.disc[v.id] ?? '—'}</span><span className="text-center font-mono font-semibold text-teal">{step.low[v.id] ?? '—'}</span></div> })}</Panel>
    <Panel title="Edge stack" icon={Layers}><div className="min-h-[68px] flex flex-col-reverse gap-1">{step.edgeStack.length === 0 ? <span className="text-xs text-muted-light italic">Stack is empty</span> : step.edgeStack.slice(-6).map((e, i) => <div key={`${e.edgeId}-${i}`} className="bg-teal/10 border border-teal/20 rounded px-2 py-1 text-[10px] text-teal font-mono">{graph.vertices.find((v) => v.id === e.from)?.label} → {graph.vertices.find((v) => v.id === e.to)?.label}</div>)}</div><div className="mt-2 text-[10px] text-muted-light">{step.components.length} component{step.components.length === 1 ? '' : 's'} closed</div></Panel>
    {revealed && quiz && step.currentVertex && <div className="bg-teal/10 border border-teal/20 rounded-xl p-4 text-xs leading-relaxed text-navy"><div className="font-semibold text-teal flex items-center gap-2"><Check size={14} /> Answer revealed</div><p className="mt-2">The algorithm compares each child’s low value with the current vertex’s discovery value. The timeline below shows exactly when that comparison becomes decisive.</p></div>}
    {finish && <Summary result={result} graph={graph} buggyMode={buggyMode} />}
  </aside>;
}


function Summary({
  result,
  graph,
  buggyMode,
}: {
  result: AlgorithmResult;
  graph: GraphModel;
  buggyMode: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-slate-100 p-2.5 shadow-card animate-fade-up">
      <div className="flex items-center gap-1 text-orange text-[9px] font-bold uppercase tracking-wide">
        <Check size={10} /> Run complete
      </div>

      <h3 className="font-serif text-sm text-navy mt-1">
        Your network map
      </h3>

      {buggyMode !== 'none' && (
        <div className="mt-1.5 bg-orange/10 text-orange rounded-md p-1.5 text-[9px] leading-snug">
          <b>Buggy mode on:</b> This result is intentionally incorrect.
          Compare with a correct run to understand the parent edge check
          and ≥ condition.
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5 mt-2">
        <div className="rounded-md bg-orange/10 p-1.5">
          <div className="text-lg font-semibold text-orange leading-tight">
            {result.articulationPoints.length}
          </div>
          <div className="text-[9px] text-muted-light mt-0.5">
            critical points
          </div>
        </div>

        <div className="rounded-md bg-teal/10 p-1.5">
          <div className="text-lg font-semibold text-teal leading-tight">
            {result.components.length}
          </div>
          <div className="text-[9px] text-muted-light mt-0.5">
            components
          </div>
        </div>
      </div>

      <div className="mt-2 space-y-1">
        {result.articulationPoints.map((id) => (
          <div key={id} className="flex items-center gap-1 text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-orange shrink-0" />
            <span className="font-semibold text-navy">
              {graph.vertices.find((v) => v.id === id)?.label}
            </span>
            <span className="text-muted-light">is a cut point</span>
          </div>
        ))}

        {result.articulationPoints.length === 0 && (
          <div className="text-[10px] text-teal flex items-center gap-1">
            <Check size={10} /> No single point of failure found.
          </div>
        )}
      </div>
    </div>
  );
}


function PlaybackControls({ result, stepIndex, playing, setPlaying, onStep, onReset, speed, setSpeed, onRun }: { result: AlgorithmResult | null; stepIndex: number; playing: boolean; setPlaying: (v: boolean) => void; onStep: (d: number) => void; onReset: () => void; speed: number; setSpeed: (n: number) => void; onRun: () => void }) { const total = result?.steps.length ?? 0; return <div className="px-5 py-4 bg-slate-50 border-t border-slate-100"><div className="flex flex-wrap items-center gap-2"><button onClick={onRun} className="flex items-center gap-2 bg-orange hover:bg-orange/90 text-white rounded-lg px-4 py-2 text-sm font-semibold transition-all hover:scale-[1.02]"><Zap size={15} /> Run DFS</button><button onClick={() => setPlaying(!playing)} disabled={!result} className="w-9 h-9 flex items-center justify-center rounded-lg bg-teal text-white disabled:opacity-40 hover:bg-teal-light transition-colors">{playing ? <Pause size={16} /> : <Play size={16} />}</button><button onClick={() => onStep(-1)} disabled={!result} className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-navy disabled:opacity-40 hover:border-teal"><StepForward size={16} className="rotate-180" /></button><button onClick={() => onStep(1)} disabled={!result} className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-navy disabled:opacity-40 hover:border-teal"><StepForward size={16} /></button><button onClick={onReset} className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-muted-light hover:text-navy" title="Reset"><RotateCcw size={15} /></button><div className="flex items-center gap-2 ml-auto text-xs text-muted-light"><span>Speed</span><input type="range" min="0.5" max="3" step="0.5" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="w-20" /><span className="font-semibold text-navy w-6">{speed}x</span></div></div><input type="range" min="0" max={Math.max(total - 1, 0)} value={stepIndex} onChange={(e) => onStep(Number(e.target.value) - stepIndex)} disabled={!result} className="w-full mt-4" /><div className="flex justify-between mt-1 text-[10px] text-muted-light"><span>{result ? `Step ${stepIndex + 1} / ${total}` : 'Ready to run'}</span><span>{result?.steps[stepIndex]?.kind ?? 'idle'}</span></div></div> }

function Panel({ title, icon: Icon, children }: { title: string; icon: typeof Layers; children: React.ReactNode }) { return <div className="bg-white rounded-xl shadow-card border border-slate-100 p-4"><h3 className="flex items-center gap-2 font-semibold text-sm text-navy mb-3"><Icon size={16} className="text-teal" /> {title}</h3>{children}</div> }
function ToolButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof Plus; label: string }) { return <button onClick={onClick} className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold transition-colors ${active ? 'bg-teal text-white' : 'bg-slate-50 border border-slate-200 text-muted-light hover:text-teal hover:border-teal/30'}`}><Icon size={13} /> {label}</button> }
function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) { return <button onClick={() => onChange(!value)} className="flex items-center justify-between w-full text-xs text-navy"><span>{label}</span><span className={`w-9 h-5 rounded-full p-0.5 transition-colors ${value ? 'bg-teal' : 'bg-slate-200'}`}><span className={`block w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${value ? 'translate-x-4' : ''}`} /></span></button> }


function RealWorldMode() {
  const [domainId, setDomainId] = useState('hospital');
  const [graph, setGraph] = useState<GraphModel>(() => defaultDomainGraph('hospital'));
  const [interaction, setInteraction] = useState<InteractionMode>('view');
  const [selectedType, setSelectedType] = useState('Emergency Room');
  const [customLabel, setCustomLabel] = useState('');
  const [analysis, setAnalysis] = useState<AlgorithmResult | null>(null);
  const [saved, setSaved] = useState<{ name: string; graph: GraphModel; domainId: string }[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('graphguard-scenarios') ?? '[]');
    } catch {
      return [];
    }
  });
  const reportRef = useRef<HTMLDivElement>(null);
  const domain = getDomain(domainId);
  const resilience = analysis ? computeResilience(graph, analysis.articulationPoints) : null;

  const changeDomain = (id: string) => {
    setDomainId(id);
    setGraph(defaultDomainGraph(id));
    setSelectedType(getDomain(id).nodeTypes[0].label);
    setAnalysis(null);
    setInteraction('view');
  };

  const addNode = () => {
    const label = customLabel.trim() || selectedType;
    const id = `v${Date.now()}`;
    const count = graph.vertices.length;
    const x = 150 + (count % 3) * 230;
    const y = 150 + Math.floor(count / 3) * 170;
    setGraph({
      vertices: [...graph.vertices, { id, x, y, label }],
      edges: graph.edges,
    });
    setCustomLabel('');
    setAnalysis(null);
  };

  const analyze = () => {
    if (graph.vertices.length) {
      setAnalysis(runAlgorithm(graph, graph.vertices[0].id));
    }
  };

  const saveScenario = () => {
    const name = window.prompt('Name this network');
    if (!name?.trim()) return;
    const next = [
      ...saved.filter((s) => s.name !== name.trim()),
      { name: name.trim(), graph, domainId },
    ];
    setSaved(next);
    localStorage.setItem('graphguard-scenarios', JSON.stringify(next));
  };

  const downloadReport = () => {
    if (!analysis) return;
    const pdf = new jsPDF();
    pdf.setFillColor(11, 31, 58);
    pdf.rect(0, 0, 210, 34, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(22);
    pdf.text('GraphGuard', 16, 16);
    pdf.setFontSize(10);
    pdf.text('Network resilience report', 16, 25);
    pdf.setTextColor(11, 31, 58);
    pdf.setFontSize(16);
    pdf.text(`${domain.name} · ${graph.vertices.length} nodes`, 16, 50);
    pdf.setFontSize(32);
    pdf.setTextColor(255, 107, 53);
    pdf.text(String(analysis.articulationPoints.length), 16, 74);
    pdf.setFontSize(11);
    pdf.setTextColor(91, 107, 122);
    pdf.text('critical points found', 16, 83);
    pdf.setTextColor(11, 31, 58);
    let y = 104;

    for (const id of analysis.articulationPoints) {
      const v = graph.vertices.find((n) => n.id === id);
      pdf.setFontSize(12);
      pdf.text(`• ${v?.label ?? id}`, 16, y);
      y += 10;
      pdf.setFontSize(9);
      pdf.setTextColor(91, 107, 122);
      const lines = pdf.splitTextToSize(describeImpact(graph, id), 175);
      pdf.text(lines, 23, y);
      y += lines.length * 5 + 8;
      pdf.setTextColor(11, 31, 58);
    }

    pdf.setFontSize(11);
    pdf.text(`Resilience score: ${resilience}%`, 16, Math.min(y + 10, 270));
    pdf.save('graphguard-network-report.pdf');
  };


  return (
    <main className="min-h-full xl:h-full max-w-[1500px] mx-auto px-4 lg:px-8 py-3">

      <div className="grid min-h-full grid-cols-1 xl:h-full xl:min-h-0 xl:grid-cols-[250px_minmax(500px,1fr)_320px] gap-3 items-stretch">
        <aside className="space-y-2">
          <Panel title="Choose your domain" icon={Network}>
            <div className="space-y-1.4">
              {domainTemplates.map((d) => {
                const Icon = d.icon;
                return (
                  <button
                    key={d.id}
                    onClick={() => changeDomain(d.id)}
                    className={`w-full text-left flex items-center gap-2 p-2 rounded-lg border transition-colors ${domainId === d.id
                        ? 'border-orange bg-orange/5'
                        : 'border-slate-100 hover:border-teal/30'
                      }`}
                  >
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${domainId === d.id ? 'bg-orange text-white' : 'bg-slate-100 text-teal'
                      }`}>
                      <Icon size={14} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-navy">{d.name}</span>
                      <span className="block text-[10px] text-muted-light truncate">{d.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Panel>


          <Panel title="Add a node" icon={Plus}>
            <label className="text-[11px] font-semibold text-navy">
              Node type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full mt-0.5 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-[11px] text-navy"
            >
              {domain.nodeTypes.map((n) => (
                <option key={n.label}>{n.label}</option>
              ))}
            </select>

            <label className="text-[11px] font-semibold text-navy block mt-1.5">
              Name (optional)
            </label>
            <input
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder={`e.g. ${selectedType}`}
              className="w-full mt-0.5 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-[11px] text-navy outline-none focus:border-teal"
            />

            <button
              onClick={addNode}
              className="w-full mt-1.5 flex items-center justify-center gap-1.5 py-1 bg-teal text-white rounded-md text-[11px] font-semibold hover:bg-teal-light transition-colors"
            >
              <Plus size={12} /> Add to map
            </button>
          </Panel>




        </aside>

        <section className="min-w-0 xl:h-full xl:overflow-y-auto">
          <div ref={reportRef} className="bg-white rounded-xl shadow-card overflow-hidden border border-slate-100">

            <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-navy">{domain.name} map</h2>
                <p className="text-xs text-muted-light mt-1">
                  {interaction === 'connect'
                    ? 'Select two nodes to add a connection.'
                    : interaction === 'delete'
                      ? 'Select a node to delete it and its connections, or select a line to delete only that connection.'
                      : 'Click and drag to reposition · Right-click a node or connection to remove it'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-light mr-2">
                  <span className="w-2 h-2 rounded-full bg-teal-light" /> Safe
                  <span className="w-2 h-2 rounded-full bg-orange ml-1" /> Critical
                </div>

                <button
                  onClick={saveScenario}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-navy hover:border-teal hover:text-teal transition-colors"
                >
                  <Save size={13} />
                  Save network
                </button>

                <details className="relative">
                  <summary className="cursor-pointer list-none inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-navy hover:border-teal">
                    <FileText size={13} />
                    Saved ({saved.length})
                    <ChevronDown size={13} />
                  </summary>

                  <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                    {saved.length === 0 ? (
                      <p className="text-xs text-muted-light">
                        Saved networks stay in this browser.
                      </p>
                    ) : (
                      <div className="max-h-40 space-y-1 overflow-y-auto">
                        {saved.map((s) => (
                          <button
                            key={s.name}
                            onClick={() => {
                              setDomainId(s.domainId);
                              setGraph(s.graph);
                              setSelectedType(getDomain(s.domainId).nodeTypes[0].label);
                              setAnalysis(null);
                            }}
                            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-navy hover:bg-slate-50 hover:text-teal"
                          >
                            <FileText size={13} />
                            {s.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </details>
              </div>
            </div>


            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2">
              <span className="mr-1 text-[11px] font-semibold text-muted-light">Edit map</span>
              <button
                type="button"
                aria-pressed={interaction === 'view'}
                onClick={() => setInteraction('view')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  interaction === 'view'
                    ? 'bg-teal text-white'
                    : 'border border-slate-200 bg-white text-navy hover:border-teal'
                }`}
              >
                <Eye size={14} /> Move nodes
              </button>
              <button
                type="button"
                aria-pressed={interaction === 'connect'}
                onClick={() => setInteraction('connect')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  interaction === 'connect'
                    ? 'bg-teal text-white'
                    : 'border border-slate-200 bg-white text-navy hover:border-teal'
                }`}
              >
                <GitBranch size={14} /> Connect nodes
              </button>
              <button
                type="button"
                aria-pressed={interaction === 'delete'}
                onClick={() => setInteraction('delete')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  interaction === 'delete'
                    ? 'bg-orange text-white'
                    : 'border border-slate-200 bg-white text-navy hover:border-orange'
                }`}
              >
                <Trash2 size={14} /> Delete node
              </button>
            </div>

            <div className="h-[300px]">
              <GraphCanvas
                graph={graph}
                onChange={(nextGraph) => {
                  setGraph(nextGraph);
                  setAnalysis(null);
                }}
                interaction={interaction}
                articulationPoints={analysis?.articulationPoints}
                nodeIcon={(id) => {
                  const v = graph.vertices.find((n) => n.id === id);
                  return v
                    ? iconForNode(
                      domainId,
                      domain.nodeTypes.find((n) => v.label.startsWith(n.label))?.label ?? selectedType
                    )
                    : null;
                }}
                showLabels
              />
            </div>

            <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-2 items-center">
              <button
                onClick={analyze}
                className="flex items-center gap-2 bg-orange text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-orange/90 hover:scale-[1.02] transition-all"
              >
                <Activity size={16} /> Analyze network
              </button>
              <button
                onClick={downloadReport}
                disabled={!analysis}
                className="flex items-center gap-2 bg-white border border-slate-200 text-navy rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-40 hover:border-teal transition-colors"
              >
                <Download size={15} /> Download report
              </button>
              <span className="text-xs text-muted-light ml-auto">
                {graph.vertices.length} nodes · {graph.edges.length} connections
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="bg-white rounded-xl shadow-card border border-slate-100 p-3">
              <div className="text-xl font-semibold text-navy">{graph.vertices.length}</div>
              <div className="text-[10px] text-muted-light">Nodes</div>
            </div>
            <div className="bg-white rounded-xl shadow-card border border-slate-100 p-3">
              <div className="text-xl font-semibold text-navy">{graph.edges.length}</div>
              <div className="text-[10px] text-muted-light">Connections</div>
            </div>
            <div className="bg-white rounded-xl shadow-card border border-slate-100 p-3">
              <div className="text-xl font-semibold text-orange">{analysis ? analysis.articulationPoints.length : '—'}</div>
              <div className="text-[10px] text-muted-light">Critical points</div>
            </div>
          </div>
        </section>

        <RiskReport analysis={analysis} graph={graph} resilience={resilience} />
      </div>
    </main>
  );
}


function RiskReport({ analysis, graph, resilience }: { analysis: AlgorithmResult | null; graph: GraphModel; resilience: number | null }) { return <aside className="space-y-2">{!analysis ? <div className="bg-navy rounded-xl p-6 text-white shadow-card"><div className="w-11 h-11 bg-teal rounded-xl flex items-center justify-center mb-5"><Gauge size={23} /></div><h2 className="font-serif text-2xl">Your risk report<br />starts here.</h2><p className="text-muted-dark text-sm leading-relaxed mt-3">When you’re ready, analyze your map to see which nodes could isolate parts of your organization if they fail.</p><div className="flex items-center gap-2 mt-5 text-xs text-teal-light"><Info size={14} /> No data leaves your browser</div></div> : <div className="space-y-4 animate-fade-up"><div className="grid grid-cols-2 gap-3"><div className="bg-white rounded-xl shadow-card border border-slate-100 p-4"><div className="text-3xl font-semibold text-orange">{analysis.articulationPoints.length}</div><div className="text-xs font-semibold text-navy mt-1">Critical points found</div><div className="text-[10px] text-muted-light mt-1">single points of failure</div></div><div className="bg-white rounded-xl shadow-card border border-slate-100 p-4"><div className="text-3xl font-semibold text-teal">{resilience}%</div><div className="text-xs font-semibold text-navy mt-1">Resilience score</div><div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-teal rounded-full transition-all" style={{ width: `${resilience}%` }} /></div></div></div><div className="bg-white rounded-xl shadow-card border border-slate-100 p-5"><h3 className="font-semibold text-navy flex items-center gap-2"><Shield size={16} className="text-orange" /> What needs attention</h3>{analysis.articulationPoints.length === 0 ? <div className="mt-4 p-3 rounded-lg bg-teal/10 text-teal text-sm leading-relaxed flex items-start gap-2"><Check size={16} className="mt-0.5 shrink-0" /> Great news — every important area has an alternate path.</div> : <div className="space-y-4 mt-4">{analysis.articulationPoints.map((id) => <div key={id} className="border-l-2 border-orange pl-3"><div className="font-semibold text-sm text-navy">{graph.vertices.find((v) => v.id === id)?.label}</div><p className="text-xs text-muted-light leading-relaxed mt-1">{describeImpact(graph, id)}</p><p className="text-xs text-orange leading-relaxed mt-2 flex items-start gap-1"><Lightbulb size={13} className="mt-0.5 shrink-0" /> {suggestRemediation(graph, id)}</p></div>)}</div>}</div><div className="bg-navy rounded-xl p-5 text-white"><div className="text-xs font-bold tracking-wider uppercase text-teal-light">How to read this</div><p className="text-sm text-muted-dark leading-relaxed mt-2">A critical point is a node whose failure splits your network into separate groups. Adding one backup connection can often remove the risk.</p></div></div>}</aside> }

export default App;
