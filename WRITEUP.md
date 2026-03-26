# Battleship — Work Trial Writeup

## Overview

Code are 100% written by Claude Code. To save time, I skipped a login system, fancy UI and images, just to keep the core gameplay.

My general workflow is by discussing with ChatGPT first, after all details are settled, I ask ChatGPT to write a detailed project description, and give it to Claude Code for all the implementation. 

---

## 1. Initial Thinking: System Design

Before writing any code, I asked myself a few basic questions:

- Do I need a backend, or can this be frontend-only?
- How should multiplayer work?
- Do I need persistence?
- How should I deploy this quickly?

I decided to go with a simple but realistic setup:

- Frontend: Next.js (TypeScript) on Vercel  
- Backend: FastAPI (Python) on Render (Docker)  
- Database: Render Postgres  

The idea was to keep the backend focused on **game correctness and synchronization**, while letting the frontend handle UI and additional features.

And the choice of languages of TypeScript and Python, is simply that I am most familiar with the two languages, for the ease of production.

---

## 2. Core Gameplay Implementation

Once the structure was clear, I focused on getting all the game mechanics right:

- Ship placement with validation
- Turn-based firing logic
- Hit / miss / sunk handling
- Win detection
- Multiplayer sync with WebSockets
- Persistence so the game survives refresh
- Storing move history for replay

I provide a detailed project description to Claude Code of all those gameplay and details after my discussion with ChatGPT.

---

## 3. Debugging and Iteration

After the initial implementation, I spent time debugging both backend and frontend:

- Verified API contracts between frontend and backend
- Checked multiplayer synchronization consistency
- Ensured game state can be reconstructed correctly from stored moves
- Fixed small logic issues and state mismatches


---

## 4. UI Iteration

Once everything was stable, I asked Claude Code to help polish the UI:

- Make interactions smoother
- Improve layout
- Make the game more intuitive to play

Nothing fancy — just making sure it feels like a real product. And during the process, I move around the UI a bit for easier gameplay.

---

## 5. Spike: Strategy Assist Mode

While testing the game, I always lose. And I always have this habit to think about if there is an optimal solution to any problem or games I am dealing with. 

So I did some research and realized that strong strategies are based on:

- Searching efficiently when nothing is known (hunt mode)
- Focusing locally after a hit (target mode)
- Using probability-like reasoning over possible ship placements

That led me to build **Strategy Assist Mode**.

---

## 6. How the Strategy Assist Works

The idea is simple:

- Given the current board (hits, misses, remaining ships)
- Try placing each remaining ship in every valid way
- Count how often each cell is used
- Use that as a “score” to recommend the next move

There are two modes:

- **Hunt Mode**: no hits yet → search globally  
- **Target Mode**: after a hit → focus on completing that ship  

This is not the exact optimal solution (that would require checking all possible full board states, which is too expensive in computation), but it’s a very good approximation and runs instantly.

I implemented this entirely on the frontend since it only uses visible information and doesn’t affect game logic.

---


## 7. Final Step: Deployment

Once everything was working:

- Deployed frontend to Vercel  
- Deployed backend (Docker) to Render  
- Set up Render Postgres  
- Connected everything and tested end-to-end  

---

## Final Thoughts

This whole project is much interesting than I expected. And I actually really enjoying building it. Especially for the part where I think about and research into the optimal strategy. It is a lot of fun!

---

The writeup is 90% written by ChatGPT. For the parts you will find grammar mistakes, that is written by me :)

Final notice: Since all service are deployed on free server, there might be a cold start problem when starting the first time :(