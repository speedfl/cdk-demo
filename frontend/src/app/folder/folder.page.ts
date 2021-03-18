import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Todo } from '../model/todo';
import { TodoService } from './services/todo.service';

@Component({
  selector: 'app-folder',
  templateUrl: './folder.page.html',
  styleUrls: ['./folder.page.scss'],
})
export class FolderPage implements OnInit {

  public folder: string;

  public newNote: FormGroup;

  public todoList = new Array<Todo>();

  constructor(private activatedRoute: ActivatedRoute,
              private todoService: TodoService,
              private formBuilder: FormBuilder) { }

  async ngOnInit() {
    this.folder = this.activatedRoute.snapshot.paramMap.get('id');
    this.todoList = await this.todoService.findAll();
  }

  addNote() {
    if (this.newNote) {
      return;
    }
    this.newNote = this.formBuilder.group({
      title: new FormControl('', Validators.required),
      message: new FormControl('', Validators.required),
    });
  }

  async deleteNote(id: string) {
    await this.todoService.deleteOne(id);
    this.todoList = this.todoList.filter(todo => todo.id != id);
  }

  async saveNote() {
    const todo = await this.todoService.addOne({ title: this.newNote.get('title').value, message: this.newNote.get('message').value});
    this.todoList.push(todo);
    this.newNote = null;
  }

}
