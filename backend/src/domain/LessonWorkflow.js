// The life of a lesson: draft → review → approved (by a specialist) → published,
// with "rejected" meaning changes were requested. One class owns these rules so the
// content and review modules cannot drift apart.
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

  // A specialist's decision on a lesson in review.
  static reviewOutcome(decision) {
    return decision === 'approve' ? 'approved' : 'rejected';
  }

  // hasSpecialist: whether the lesson's topic (disease) has an assigned specialist.
  constructor({ hasSpecialist }) {
    this.hasSpecialist = Boolean(hasSpecialist);
  }

  // The status a lesson really gets when someone asks for `requested`. Publishing a
  // lesson on a topic with a specialist is held in review until it is approved.
  resolve(requested, current = null) {
    if (requested !== 'published' || ['approved', 'published'].includes(current)) return requested;
    return this.hasSpecialist ? 'review' : requested;
  }

  // True when the request was held back, so the API can explain why.
  isHeldForReview(requested, current = null) {
    return requested === 'published' && this.resolve(requested, current) !== 'published';
  }
}
