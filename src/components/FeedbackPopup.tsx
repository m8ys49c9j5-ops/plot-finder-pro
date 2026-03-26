import ContactDialog from "@/components/ContactDialog";

interface FeedbackPopupProps {
  open: boolean;
  onClose: () => void;
}

export default function FeedbackPopup({ open, onClose }: FeedbackPopupProps) {
  return <ContactDialog open={open} onClose={onClose} />;
}
