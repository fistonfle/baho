// The life of a lesson: draft → review → published, with the specialist assigned
// to the disease being the one who publishes it, and "rejected" meaning changes
// were requested. One class owns these rules so the content and review modules
// cannot drift apart.
//
// "approved" remains a valid status because lessons approved under the earlier
// workflow still carry it, but nothing sets it any more: a specialist's approval
// publishes the lesson in one step.
export class LessonWorkflow {
  static statuses = Object.freeze(['draft', 'review', 'approved', 'published', 'rejected']);

  // Writers can only save drafts or send for review; admins can set any status.
  static #roleStatuses = { creator: ['draft', 'review'] };

  static isValid(status) {
    return LessonWorkflow.statuses.includes(status);
  }

  static allowedFor(role) {
    return LessonWorkflow.#roleStatuses[role] ?? LessonWorkflow.statuses;
  }

  // A specialist's decision on a lesson in review. Approval publishes it: the
  // specialist is the clinical authority, so no further step adds anything.
  static reviewOutcome(decision) {
    return decision === 'approve' ? 'published' : 'rejected';
  }

  // The status a lesson really gets when someone asks for `requested`. Every
  // request to publish is held in review until the specialist for that disease
  // approves it. A disease with no specialist therefore has no route to
  // publication, which is deliberate: nothing reaches a learner without a named
  // clinical reviewer behind it.
  resolve(requested, current = null) {
    if (requested !== 'published' || ['approved', 'published'].includes(current)) return requested;
    return 'review';
  }

  // True when the request was held back, so the API can explain why.
  isHeldForReview(requested, current = null) {
    return requested === 'published' && this.resolve(requested, current) !== 'published';
  }
}
