const url1 = "https://scontent.xx.fbcdn.net/v/t39.30808-6/447291176_122177437194165689_3232801456250604117_n.jpg?stp=dst-jpg_s206x206&_nc_cat=101";
const url2 = "https://scontent.xx.fbcdn.net/v/t39.30808-6/p200x200/447291176_n.jpg?_nc_cat=101";

function clean(urlStr) {
  const u = new URL(urlStr);
  if (u.searchParams.has('stp')) u.searchParams.delete('stp');
  u.pathname = u.pathname.replace(/\/[sp]\d+x\d+\//g, '/');
  u.pathname = u.pathname.replace(/\/c\d+\.\d+\.\d+\.\d+\//g, '/');
  return u.toString();
}
console.log(clean(url1));
console.log(clean(url2));
