import { X } from "lucide-react";

interface FeedbackPopupProps {
  open: boolean;
  onClose: () => void;
}

export default function FeedbackPopup({ open, onClose }: FeedbackPopupProps) {
  if (!open) return null;

  return (
    <div className="fixed bottom-14 left-2 z-[900] glass-panel rounded-xl shadow-xl p-4 w-72 border border-border animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-foreground">Rašykite mums</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>
      <form onSubmit={(e) => {
        e.preventDefault();
        const val = (e.currentTarget.elements.namedItem("feedback") as HTMLTextAreaElement)?.value;
        if (val?.trim()) {
          window.open(`mailto:zemeprolt@gmail.com?subject=${encodeURIComponent("ŽemėPro atsiliepimas")}&body=${encodeURIComponent(val)}`);
          setTimeout(() => onClose(), 300);
        }
      }}>
        <textarea
          name="feedback"
          placeholder="Jūsų komentaras, idėja ar pasiūlymas..."
          className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 resize-none h-24 focus:ring-1 focus:ring-primary outline-none"
        />
        <button type="submit" className="mt-2 w-full premium-gradient text-primary-foreground text-xs font-semibold rounded-lg py-2 hover:opacity-90 transition-opacity">
          Siųsti
        </button>
      </form>
      <a href="mailto:zemeprolt@gmail.com" className="text-xs text-muted-foreground hover:text-foreground mt-2 inline-block">
        zemeprolt@gmail.com
      </a>
    </div>
  );
}
