# Server

- [ ] Add user groups
- [ ] Make sure deleted users can't use their token to change things
  - This could be done by checking the db with every request or using a shorter
    timeout and adding a refresh token

# Client

- [x] Finish book/series editing
- [ ] Add settings page
  - [ ] Cache management, what series/books to download
  - [ ] Maybe server configs like what directory to look at
- [ ] Style pages
- [x] Improve reading experience
  - [x] Respect deleted pages
- [ ] Offline Support
