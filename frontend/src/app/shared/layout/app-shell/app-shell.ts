import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from '../navbar/navbar';
import { Sidebar } from '../sidebar/sidebar';

@Component({
  selector: 'app-app-shell',
  standalone: true,
  imports: [RouterOutlet, Navbar, Sidebar],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css',
})
export class AppShell {}