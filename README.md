# FormCraft ⚡
A simple, self-hosted backend service that handles form submissions for static websites.

---

## Why I Built This

When building static websites (using HTML, CSS, React, or modern site generators), there is a common headache: **handling contact forms**. 

A static website has no backend server or database to receive messages or store them. Frontend developers usually have two choices:
1. Spend hours setting up a whole server, database, email service, and spam filters just for a single contact form.
2. Pay $15 to $40 every month to services like Formspree or Typeform.

I built **FormCraft** to solve this. It gives you a ready-to-use endpoint URL that you can paste into any HTML form. FormCraft handles the rest: validating the data, filtering out spam bots, saving the submissions to a cloud database, and letting you inspect or download the messages in a clean dashboard.

---

## How It Works

1. You open the FormCraft dashboard and click **Create Form**.
2. FormCraft gives you a unique endpoint URL:
   ```
   http://localhost:5000/api/submit/6af6b50ae4ff...
   ```
3. You paste that URL into your HTML form on any website:
   ```html
   <form action="http://localhost:5000/api/submit/6af6b50ae4ff..." method="POST">
     <input type="text" name="name" required />
     <input type="email" name="email" required />
     <textarea name="message" required></textarea>
     <button type="submit">Send</button>
   </form>
   ```
4. When a visitor submits the form, FormCraft catches the data, checks for bot spam, and stores it in MongoDB.
5. In your FormCraft dashboard, you can view your messages like an email inbox or export them as a CSV spreadsheet.

---

## Why MongoDB?

A question interviewers often ask: *"Why did you choose MongoDB instead of MySQL or PostgreSQL?"*

In a traditional SQL database, tables have fixed columns. If Form A collects `name` and `email`, but Form B collects `company`, `budget`, and `timeline`, an SQL table would need schema migrations or messy alterations for every new form.

In **MongoDB**, documents are flexible JSON-like objects. Using Mongoose's `Schema.Types.Mixed`, FormCraft accepts and stores completely different form structures inside the same collection effortlessly, without breaking any schema.

---

## Key Features

- **Dynamic Form Storage:** Accepts any field names from any form automatically.
- **Honeypot Spam Protection:** Catches automated web bots using a hidden trap field (`_gotcha`) without bothering real human visitors with CAPTCHAs.
- **CSV Spreadsheet Export:** Downloads all submissions for any form as a clean `.csv` file using HTTP response headers (`Content-Disposition: attachment`).
- **Cascade Deletion:** When a form is deleted, all its associated submissions are automatically deleted to prevent orphan records.
- **Clean Dashboard UI:** Built with pure Vanilla JavaScript (DOM manipulation and `fetch` API) to view messages, create forms, and test submissions in real time.

---

## Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** MongoDB Atlas (Cloud), Mongoose
- **Frontend:** HTML5, Tailwind CSS, Vanilla JavaScript (ES6+)
- **Tools & Security:** CORS, Dotenv, Git

---

## Running Locally

### 1. Clone the repository
```bash
git clone https://github.com/BhagyashreeDev/formcraft.git
cd formcraft
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup your environment variables
Create a `.env` file in the root folder:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
```

### 4. Run the development server
```bash
npm run dev
```

Open your browser and visit:
```
http://localhost:5000
```

---

## Author
Built by **Bhagyashree Badadal**
- GitHub: [@BhagyashreeDev](https://github.com/BhagyashreeDev)
- Email: bhagyashree.b.eng@gmail.com
