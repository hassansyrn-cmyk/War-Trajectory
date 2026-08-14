import React, { useState } from "react";

interface Props {
  onPractice: () => void;
  onExit: () => void;
}

const STEPS = [
  { title: "1. اسحب للتصويب", body: "اسحب إصبعك للخلف ولأعلى لتحديد قوة وزاوية المقذوف. حرر إصبعك للإطلاق." },
  { title: "2. اقرأ الرياح", body: "راقب السهم أعلى الشاشة. الرياح تدفع المقذوفات، لذلك عدّل زاويتك أو قوتك." },
  { title: "3. تموضع بذكاء", body: "استخدم أسهم الحركة قبل الإطلاق. التلال تمنحك مساراً جديداً لكنها تستهلك التحمل." },
  { title: "4. اختر أداتك", body: "لكل محارب عتاد مختلف. استخدم المتفجرات للمنطقة، والجليد لإبطاء الخصم، والمهارات في اللحظة المناسبة." },
];

export default function TutorialScreen({ onPractice, onExit }: Props) {
  const [step, setStep] = useState(0);
  const item = STEPS[step];
  const last = step === STEPS.length - 1;
  return (
    <div className="tutorial-root">
      <div className="select-header"><button className="icon-btn" onClick={onExit} aria-label="رجوع">‹</button><h1>التدريب السريع</h1><span style={{ width: 30 }} /></div>
      <div className="tutorial-card">
        <div className="tutorial-step">{step + 1} / {STEPS.length}</div>
        <h2>{item.title}</h2>
        <p>{item.body}</p>
        <div className="tutorial-dots">{STEPS.map((_, index) => <span key={index} className={index === step ? "active" : ""} />)}</div>
        <div className="overlay-actions">
          {step > 0 && <button className="secondary-btn" onClick={() => setStep((value) => value - 1)}>السابق</button>}
          {last ? <button className="primary-btn" onClick={onPractice}>ابدأ مباراة تدريبية</button> : <button className="primary-btn" onClick={() => setStep((value) => value + 1)}>التالي</button>}
        </div>
      </div>
    </div>
  );
}
