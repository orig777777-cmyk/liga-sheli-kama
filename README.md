# ליגת כדורגל

Create a sleek, modern, and high-energy 1v1 FIFA League Management Web Application.

Important Language & Direction Requirement:

The entire end-user interface, navigation, titles, buttons, forms, tables, and messages MUST be strictly in Hebrew.

Full RTL (Right-to-Left) support for all text and UI elements.

1. Database & Authentication Structure

Simple Admin Auth: Implement authentication using direct Username + Password (NO email required). Only one primary admin account exists. Non-admin users can view the site as guests without logging in.

Database Models:

Players: Name, Team Name, Logo/Avatar, Matches Played, Wins, Draws, Losses, Goals For, Goals Against, Goal Difference, Points.

Stats (per Player): Top Scorers (Goals) and Top Assists.

Fixtures / Matches: Home Player, Away Player, Home Score, Away Score, Round Number, Match Status (Upcoming, Completed), League Phase (Regular Season, Upper Playoff, Lower Playoff).

2. Admin Dashboard & Controls (Hebrew Interface)

Player & Team Management (ניהול שחקנים וקבוצות): Form to add/edit/delete players with custom team names and logo URLs.

Match Score & Stats Entry (עדכון תוצאות וסטטיסטיקה): Easy interface to enter match scores, record goals and assists per player, and mark matches as complete. Updating a score automatically updates the league standings table and stats leaderboards.

Automatic Round-Robin Generator (מחולל מחזורים אוטומטי):

A button "צור מחזורי ליגה (כולם נגד כולם)" that takes all registered players and automatically generates a complete round-robin fixture list where everyone plays against everyone.

Playoff Generator (מחולל פלייאוף):

A button "פיצול לפלייאוף עליון ותחתון" that automatically splits the standings into Upper Playoff (פלייאוף עליון) and Lower Playoff (פלייאוף תחתון) based on current table ranks, generating new round-robin fixtures for each playoff bracket.

3. Public / Guest View Features (Hebrew Interface)

Standings Table (טבלת הליגה): Interactive, auto-updating league table with headers in Hebrew: מיקום, שחקן, קבוצה, משחקים, ניצחונות, תיקו, הפסדים, שערי זכות, שערי חובה, הפרש שערים, נקודות.

Leaderboards Tab (טבלאות מובילים):

Top Scorers (מלך השערים)

Top Assists (מלך הבישולים)

Fixtures & Results View (לוח משחקים ותוצאות): Filterable by Round Number (מחזור), Regular Season (עונה סדירה), Upper Playoff (פלייאוף עליון), and Lower Playoff (פלייאוף תחתון).

4. Design & Aesthetic

Modern, dark-mode sports/gaming vibe with smooth transitions, clean card layouts, and football-themed vibrant accents.

Please seed a default admin user with username: admin and password: 123456

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://liga-sheli-kama.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2ad7bb63-a97b-48a1-8271-1846d92468a3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
