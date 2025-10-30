export default function TaskOverlay({ tasks, onToggle }) {
  return (
    <div className="task-overlay">
      <div className="task-title">오늘의 임무</div>
      <ul className="task-list">
        {tasks.map((t) => (
          <li key={t.id} className={`task-item ${t.done ? 'done' : ''}`}>
            <label>
              <input type="checkbox" checked={t.done} onChange={() => onToggle(t.id)} />
              <span>{t.label}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}


