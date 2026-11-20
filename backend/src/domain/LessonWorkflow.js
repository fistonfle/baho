// Lesson statuses: draft -> review -> published, or rejected when changes are needed.
// 'approved' is only kept for old lessons.
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

  // Specialist approval publishes the lesson directly.
  static reviewOutcome(decision) {
    return decision === 'approve' ? 'published' : 'rejected';
  }

  // Publishing always goes through review, so nothing goes live without a specialist.
  resolve(requested, current = null) {
    if (requested !== 'published' || ['approved', 'published'].includes(current)) return requested;
    return 'review';
  }

  // True when the request was held back, so the API can explain why.
  isHeldForReview(requested, current = null) {
    return requested === 'published' && this.resolve(requested, current) !== 'published';
  }
}
