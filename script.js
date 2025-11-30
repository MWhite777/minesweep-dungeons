alert("Script loaded – no crash yet");
document.getElementById("login").style.display = "block";
function login() {
    alert("Play pressed – entering hub");
    document.getElementById("login").style.display = "none";
    document.getElementById("hub").style.display = "block";
}
