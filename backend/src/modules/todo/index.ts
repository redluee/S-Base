import { TodoCategories } from "./todo-categories";
import { TodoCompletion } from "./todo-completion";
import { TodoHistory } from "./todo-history";
import { TodoLinks } from "./todo-links";
import { TodoSubtasks } from "./todo-subtasks";
import { TodoTasks } from "./todo-tasks";

export class TodoService {
  readonly categories = new TodoCategories();
  readonly links = new TodoLinks();
  readonly subtasks = new TodoSubtasks();
  readonly tasks = new TodoTasks(this.categories, this.links, this.subtasks);
  readonly completion = new TodoCompletion(this.tasks, this.links);
  readonly history = new TodoHistory(this.tasks, this.links, this.subtasks);
}
