## 🧹 A trash that takes care of itself

Clearing the trash meant one session at a time, and forgotten sessions stayed
in the list forever. Both now take one click.

### What's new

#### 🗑️ Empty trash

In the Trash view, the **Empty trash** button deletes everything there at once,
after a confirmation that shows how many sessions are going. If you are
filtering by project or searching, it only deletes what is on screen, never
what you can't see.

#### ⚙️ Settings and auto-trash

The gear in the header opens the settings. The first one is **auto-trash**:
pick a window (7, 14, 30, 60, 90 or 180 days) and sessions unused for that
long move to the trash on their own when the dashboard opens. Before you save,
it tells you how many sessions that would move today.

It ships turned off, so nothing changes until you pick a window. And it is
careful:

- **Favorites are never moved.**
- **Nothing leaves the disk.** The session only goes to the trash, where you
  can restore it.
- **Resume it and it's back.** If you continue a session that was trashed
  automatically, it returns to the list.
- **Restoring counts as use.** An old session you pull out of the trash by hand
  is not sent back on the next refresh: its clock starts over.
