import { Inject, Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { catchError, map, retry, tap } from 'rxjs/operators';
import { ForumThread } from 'src/data/models/entities/ForumThread';
import { ForumThreadReply } from 'src/data/models/entities/ForumThreadReply';
import { UserProfile } from 'src/data/models/entities/UserProfile';
import { DATA_INJECTION_TOKENS } from 'src/data/services/data-injection-tokens';
import { EntityDataIService } from 'src/data/services/entity.data.iservice';
import { ForumFilters } from './ForumFilters';

@Injectable({ providedIn: 'root' })
export class ForumService
  implements OnDestroy {

  protected threadsArray: ForumThread[] = [];
  public threadsSource: Subject<ForumThread[]> = new BehaviorSubject(this.threadsArray);
  public filters: Partial<ForumFilters> = {};

  public get questions(): ForumThread[] {
    return this.threadsArray;
  }
  public set questions(questions: ForumThread[]) {

    this.threadsArray = questions;
    this.threadsSource.next(questions);
  }

  public get users$(): Observable<UserProfile[]> {
    return this.usersData.readAll();
  }

  constructor(
    @Inject(DATA_INJECTION_TOKENS.forum) protected data: EntityDataIService<ForumThread>,
    @Inject(DATA_INJECTION_TOKENS.users) protected usersData: EntityDataIService<UserProfile>
  ) {
  }

  ngOnDestroy(): void {
    this.threadsSource.complete();
  }

  public reloadQuestions(): void {
    const noFilters = (JSON.stringify(this.filters) === '{}');
    const query: Observable<ForumThread[]> = noFilters ? this.data.readAll() : this.data.readFiltered(this.filters);

    query.pipe(
      catchError(() => []),
      retry(1)
    ).subscribe(
      items => {
        if (items) {
          this.questions = items;
        }
      }
    );
  }

  public insertQuestion(qst: ForumThread): Observable<ForumThread> {
    return this.data.create(qst);
  }
  public updateQuestion(qst: ForumThread): Observable<ForumThread> {
    return this.data.update(qst, qst.id);
  }
  public replyToQuestion(ans: ForumThreadReply, qstId: number): Observable<boolean> {
    return this.data.readById(qstId).pipe(
      tap(
        (q) => {
          if (q) {
            q.answers.push(ans);
            this.data.update(q, qstId).subscribe();
          }
        }
      ),
      map(q => !!q)
    );
  }

}
