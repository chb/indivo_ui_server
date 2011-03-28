// FIXME: this stuff should be in the /ui/test/funcunit/settings.js file, but since
// we can't get that file to be read, we're putting config here

FuncUnit = {
	// the list of browsers that selenium runs tests on
	browsers: ["*firefox"], //["*firefox", "*iexplore"],
	
	// the root for all paths in the tests, defaults to filesystem
	jmvcRoot: "http://localhostXXX/", // "http://localhost:8000/",
	
	// the number of milliseconds between Selenium commands, "slow" is 500 ms
	speed: null, //"slow"
}