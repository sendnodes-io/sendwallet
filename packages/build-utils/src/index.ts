import childProcess from "child_process";
import WebextArchive from "./web-extension-archive-webpack-plugin";

const getRevision = () =>
	childProcess
		.execSync("git rev-parse --short HEAD &2> /dev/null || echo 'unknown'")
		.toString()
		.trim();

const getBranch = () =>
	childProcess
		.execSync("git rev-parse --abbrev-ref HEAD &2> /dev/null || echo 'unknown'")
		.toString()
		.trim();

export { getRevision, getBranch };

export default WebextArchive;
