import React, { useState } from 'react';
import { Station, Review } from '../types/charging';

interface ReviewsModalProps {
  station: Station;
  onClose: () => void;
}

export const ReviewsModal: React.FC<ReviewsModalProps> = ({ station, onClose }) => {
  const [reviewsList, setReviewsList] = useState<Review[]>(station.reviews);
  const [newContent, setNewContent] = useState('');
  const [rating, setRating] = useState(5);
  const [vehicle, setVehicle] = useState('Polestar 2');

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    const newRev: Review = {
      id: `rev-${Date.now()}`,
      author: 'You (Verified Driver)',
      vehicle,
      timeAgo: 'Just now',
      rating,
      content: newContent.trim(),
    };

    setReviewsList([newRev, ...reviewsList]);
    setNewContent('');
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#0d1c2f]/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 flex flex-col gap-4 border border-[#dde9ff] max-h-[88vh] overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined text-[#ffb95f] text-[24px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              star
            </span>
            <h3 className="text-lg font-bold text-[#0d1c2f]">Driver Check-ins</h3>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="w-11 h-11 rounded-full bg-[#eff4ff] flex items-center justify-center text-[#3d4a42] hover:bg-[#dde9ff]"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="flex items-center justify-between p-3 rounded-2xl bg-[#eff4ff]">
          <div>
            <div className="text-2xl font-black text-[#0d1c2f]">{station.rating}</div>
            <div className="text-xs text-[#3d4a42]">{station.checkInsCount} verified reviews</div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold text-[#006948]">98% Working Reliably</div>
            <div className="text-[10px] text-[#3d4a42]">Fast cable release & no queues</div>
          </div>
        </div>

        {/* Add Review Form */}
        <form onSubmit={handleAddReview} className="flex flex-col gap-2 p-3 rounded-2xl bg-[#f8f9ff] border border-[#dde9ff]">
          <span className="text-xs font-bold text-[#0d1c2f]">Leave a Driver Check-in:</span>
          <div className="flex items-center gap-2">
            <select
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value)}
              className="p-2 rounded-xl bg-white border border-[#dde9ff] text-xs font-medium text-[#0d1c2f]"
            >
              <option value="Polestar 2">Polestar 2</option>
              <option value="Tesla Model Y">Tesla Model Y</option>
              <option value="BYD Atto 3">BYD Atto 3</option>
              <option value="Hyundai Ioniq 5">Hyundai Ioniq 5</option>
              <option value="BMW i4">BMW i4</option>
            </select>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  className="cursor-pointer"
                >
                  <span
                    className={`material-symbols-outlined text-[20px] ${
                      star <= rating ? 'text-[#ffb95f]' : 'text-slate-300'
                    }`}
                    style={{ fontVariationSettings: star <= rating ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    star
                  </span>
                </button>
              ))}
            </div>
          </div>

          <textarea
            rows={2}
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="e.g. Bay A1 pumped 118kW peak, no queue, cable long enough..."
            className="w-full p-2.5 rounded-xl bg-white border border-[#dde9ff] text-xs text-[#0d1c2f] focus:outline-none placeholder:text-[#6d7a72]"
          />

          <button
            type="submit"
            className="min-h-12 px-5 rounded-xl bg-[#006948] text-white text-sm font-bold hover:bg-[#00855d] active:scale-95 transition-all self-end cursor-pointer"
          >
            Post Check-in
          </button>
        </form>

        {/* Reviews List */}
        <div className="flex flex-col gap-2.5">
          {reviewsList.length === 0 ? (
            <div className="p-4 rounded-2xl bg-[#eff4ff] text-center text-xs text-[#3d4a42]">
              No driver reviews submitted yet for this charging point. Be the first driver to leave a check-in note!
            </div>
          ) : (
            reviewsList.map((rev) => (
              <div
                key={rev.id}
                className="p-3 rounded-2xl bg-[#eff4ff] flex flex-col gap-1 border border-[#dde9ff]/50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#0d1c2f]">{rev.author}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white text-[#3d4a42] font-medium">
                      {rev.vehicle}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span
                      className="material-symbols-outlined text-[#ffb95f] text-[16px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                    <span className="text-xs font-bold text-[#0d1c2f]">{rev.rating}.0</span>
                  </div>
                </div>
                <p className="text-xs text-[#3d4a42] leading-relaxed">{rev.content}</p>
                <span className="text-[10px] text-[#6d7a72] self-end">{rev.timeAgo}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
