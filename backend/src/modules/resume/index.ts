import { ResumeDocuments } from "./resume-documents";
import { ResumeLibrary } from "./resume-library";
import { ResumeProfiles } from "./resume-profile";

export { PHOTO_EXTENSIONS, PHOTO_MAX_BYTES } from "./resume-profile";

export class ResumeService {
  readonly profile = new ResumeProfiles();
  readonly library = new ResumeLibrary();
  readonly resumes = new ResumeDocuments(this.library, this.profile);
}
