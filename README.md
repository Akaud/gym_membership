# Installation of packages
Basic pip installation command
```bash
pip install -r requirements.txt
```
This installs fnm (Fast Node Manager) using Windows Package Manager (winget).
```bash
winget install Schniz.fnm
```
Node packages
```bash
npm install react-router-dom react-scripts@latest bulma moment http-proxy-middleware sass
```
Automatically fixes security vulnerabilities found by npm audit
```bash
npm audit fix 
```
# Don`t forget to crate .env file for environmental variables
# How to run servers
## Backend
First of all go to backend directory
```bash
cd backend
```
And after that load backend server
```bash
uvicorn main:app --reload
```
## Frontend
Go to frontend directory
```bash
cd frontend
```
And start server
```bash
npm start
```