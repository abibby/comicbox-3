# Server

- [ ] Add user groups
- [ ] Make sure deleted users can't use their token to change things
  - This could be done by checking the db with every request or using a shorter
    timeout and adding a refresh token
- [ ] Add option to only allow existing users to add new users
- [x] automatically set spread pages

# Client

- [x] Finish book/series editing
- [ ] Add settings page
  - [ ] Cache management, what series/books to download
  - [ ] Maybe server configs like what directory to look at
- [ ] Style pages
- [x] Improve reading experience
  - [x] Respect deleted pages
- [x] Offline Support
  - [ ] look into update process. It looks like it responds to js requests with
        index.html after an update
- [ ] Add option to change from one page to two page view
  - Start as auto, based on portrait/landscape, and add forced options
- [x] navigate to next/previous book when moving to next/previous on first/last
      page
- [x] add keyboard nav to reader
- [ ] add support for one page books
- [ ] Look into thumbnail cache issue with non 200 responses
- [ ]
