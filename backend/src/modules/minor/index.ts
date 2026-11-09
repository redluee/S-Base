import { MinorDashboard } from "./minor-dashboard";
import { MinorEvaluationDrafts } from "./minor-evaluation-drafts";
import { MinorEvaluations } from "./minor-evaluations";
import { MinorFeedback } from "./minor-feedback";
import { MinorPeerHelpLog } from "./minor-peer-help";
import { MinorSchedule } from "./minor-schedule";
import { MinorSettingsStore } from "./minor-settings";
import { MinorSprints } from "./minor-sprints";
import { MinorStories } from "./minor-stories";
import { MinorStoryTypes } from "./minor-story-types";
import { MinorTransfer } from "./minor-transfer";
import { PublishNotifier } from "./publish-notifier";

export { calculateSprintStatus, DEFAULT_STORY_TYPES } from "./minor-helpers";

export class MinorService {
  private readonly notifier = new PublishNotifier();
  readonly schedule = new MinorSchedule();
  readonly storyTypes = new MinorStoryTypes();
  readonly evaluations = new MinorEvaluations(this.notifier);
  readonly sprints = new MinorSprints(this.schedule, this.evaluations);
  readonly drafts = new MinorEvaluationDrafts(this.sprints);
  readonly stories = new MinorStories(this.evaluations, this.notifier);
  readonly feedback = new MinorFeedback(this.notifier);
  readonly peerHelp = new MinorPeerHelpLog();
  readonly settings = new MinorSettingsStore();
  readonly dashboard = new MinorDashboard(this.sprints, this.peerHelp);
  readonly transfer = new MinorTransfer(this.sprints, this.stories, this.schedule, this.evaluations, this.feedback);

  listSprints: MinorSprints["list"] = (userId) => this.sprints.list(userId);
  getSprintById: MinorSprints["getById"] = (id, userId) => this.sprints.getById(id, userId);
  createSprint: MinorSprints["create"] = (userId, data) => this.sprints.create(userId, data);
  createStory: MinorStories["create"] = (userId, sprintId, data) => this.stories.create(userId, sprintId, data);
  addFeedback: MinorFeedback["add"] = (sprintId, data) => this.feedback.add(sprintId, data);
  saveSelfEvaluations: MinorEvaluations["saveSelfEvaluations"] = (sprintId, userId, items) =>
    this.evaluations.saveSelfEvaluations(sprintId, userId, items);
  listPeerHelp: MinorPeerHelpLog["list"] = (userId) => this.peerHelp.list(userId);
  createPeerHelp: MinorPeerHelpLog["create"] = (userId, data) => this.peerHelp.create(userId, data);
  listVacations: MinorSchedule["listVacations"] = (userId) => this.schedule.listVacations(userId);
}
