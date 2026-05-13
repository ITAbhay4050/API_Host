
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Star } from 'lucide-react';
import { Ticket } from '@/types';

interface FeedbackDialogProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket | null;
  userRole: string;
  onSubmitFeedback: (feedbackData: any) => void;
}

const FeedbackDialog = ({ isOpen, onClose, ticket, userRole, onSubmitFeedback }: FeedbackDialogProps) => {
  const [satisfactionScore, setSatisfactionScore] = useState(5);
  const [comments, setComments] = useState('');
  const [followUpNeeded, setFollowUpNeeded] = useState(false);

  const handleSubmit = () => {
    if (!comments.trim()) {
      return;
    }

    const feedbackData = {
      satisfactionScore,
      comments,
      followUpNeeded,
      submittedAt: new Date().toISOString(),
      userRole
    };

    onSubmitFeedback(feedbackData);
    
    // Reset form
    setSatisfactionScore(5);
    setComments('');
    setFollowUpNeeded(false);
    onClose();
  };

  const renderStars = () => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-6 w-6 cursor-pointer ${
              star <= satisfactionScore ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
            onClick={() => setSatisfactionScore(star)}
          />
        ))}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Submit Feedback</DialogTitle>
          <DialogDescription>
            Please provide your feedback for this resolved ticket before it can be closed.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Ticket Details</Label>
            <div className="p-3 bg-muted rounded-md">
              <p className="font-medium">{ticket?.issueDescription}</p>
              <p className="text-sm text-muted-foreground">
                Resolution: {ticket?.resolutionNotes}
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Satisfaction Rating *</Label>
            <div className="flex items-center gap-2">
              {renderStars()}
              <span className="text-sm text-muted-foreground">({satisfactionScore}/5)</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comments">Comments *</Label>
            <Textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Please provide your feedback about the service quality and resolution..."
              rows={4}
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="followUp" 
              checked={followUpNeeded}
              onCheckedChange={(checked) => setFollowUpNeeded(checked === true)}
            />
            <Label htmlFor="followUp">Follow-up required</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!comments.trim()}>
            Submit Feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackDialog;
