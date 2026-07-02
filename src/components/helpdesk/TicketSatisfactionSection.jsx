import { useState } from 'react';
import TicketStarRating from './TicketStarRating';

function formatRatedAt(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TicketSatisfactionDisplay({ rating, feedback, ratedAt }) {
  return (
    <div className="space-y-2">
      <TicketStarRating value={rating} readOnly />
      {feedback && (
        <p className="text-sm text-slate-600 bg-white rounded-lg border border-slate-100 px-3 py-2">
          {feedback}
        </p>
      )}
      {ratedAt && (
        <p className="text-[10px] text-slate-400">Rated on {formatRatedAt(ratedAt)}</p>
      )}
    </div>
  );
}

export function TicketSatisfactionForm({ onSubmit, isSubmitting, error }) {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (rating < 1) return;
        onSubmit({ rating, feedback: feedback.trim() || undefined });
      }}
    >
      <div>
        <p className="text-sm text-slate-700 mb-2">How satisfied were you with the support?</p>
        <TicketStarRating value={rating} onChange={setRating} />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600">Feedback (optional)</label>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Tell us what went well or what could improve…"
          className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
        />
      </div>
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
      <button
        type="submit"
        disabled={rating < 1 || isSubmitting}
        className="btn-primary text-sm"
      >
        {isSubmitting ? 'Submitting…' : 'Submit Rating'}
      </button>
    </form>
  );
}
