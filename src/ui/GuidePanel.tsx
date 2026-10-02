// "Your first factory" checklist plus the compact step tracker shown in the Build tab banner.
import { getFacilityArt, getTabArt } from "../assets/art";
import type { GameState } from "../game/state/types";
import { getGuideProgress } from "../game/tech/guide";

type Progress = ReturnType<typeof getGuideProgress>;

const SHORT_LABELS: Record<string, string> = { power: "Power", mine: "Mine", workers: "Workers", smelt: "Smelt", steel: "Steel", sell: "Sell" };

export function GuideSteps({ progress }: { progress: Progress }) {
  return (
    <ol className="gd-steps" aria-label={`Getting started: step ${progress.currentIndex + 1} of ${progress.steps.length}`}>
      {progress.steps.map((step, index) => (
        <li key={step.id} className={step.complete ? "done" : index === progress.currentIndex ? "now" : ""} aria-current={index === progress.currentIndex ? "step" : undefined}>
          <i aria-hidden="true">{step.complete ? "✓" : index + 1}</i>{SHORT_LABELS[step.id]}
        </li>
      ))}
    </ol>
  );
}

type GuidePanelProps = {
  game: GameState;
  progress: Progress;
  onDismiss: () => void;
  onOpenCargo: () => void;
};

export function GuidePanel({ progress, onDismiss, onOpenCargo }: GuidePanelProps) {
  return (
    <section className="panel gd-panel" aria-label="Getting started checklist">
      <div className="gd-head">
        <div><p className="eyebrow">Getting started · {progress.doneCount} / {progress.steps.length}</p><h3>Your first factory</h3></div>
        <button type="button" className="secondary small gd-hide" onClick={onDismiss} title="Hide the getting-started guide">Hide</button>
      </div>
      <div className="gd-meter" aria-hidden="true"><i style={{ width: `${(progress.doneCount / progress.steps.length) * 100}%` }} /></div>
      <ul className="gd-list">
        {progress.steps.map((step, index) => {
          const state = step.complete ? "done" : index === progress.currentIndex ? "now" : "todo";
          return (
            <li key={step.id} className={`gd-item ${state}`}>
              <i aria-hidden="true">{step.complete ? "✓" : index + 1}</i>
              <span>{step.label}<small>{step.hint}</small></span>
              {state === "now" && step.id === "sell"
                ? <button type="button" className="small gold" onClick={onOpenCargo}>Open Cargo</button>
                : <img className="pixel-icon" src={step.icon === "market" ? getTabArt("market") : getFacilityArt(step.icon)} alt="" width={22} height={22} />}
              <span className="visually-hidden">{state === "done" ? "done" : state === "now" ? "current step" : "to do"}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
