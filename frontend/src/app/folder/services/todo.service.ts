import { Injectable } from "@angular/core";
import { HttpClient } from '@angular/common/http';
import { Todo } from "src/app/model/todo";
import { environment } from "src/environments/environment";

@Injectable({ providedIn: 'root'})
export class TodoService {

  constructor(private http: HttpClient) { }

  public async findAll(): Promise<Array<Todo>> {
    return this.http.get<Array<Todo>>(`${environment.apiUrl}/todo`).toPromise();
  }

  public async findOne(name: string): Promise<Todo> {
    return this.http.get<Todo>(`${environment.apiUrl}/todo/${name}`).toPromise();
  }

  public async deleteOne(name: string): Promise<void> {
    this.http.delete(`${environment.apiUrl}/todo/${name}`).toPromise();
  }

  public async addOne(todo: Todo): Promise<Todo> {
    return this.http.post<Todo>(`${environment.apiUrl}/todo`, todo).toPromise();
  }
}
