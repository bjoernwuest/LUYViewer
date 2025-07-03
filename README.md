![LUY Viewer logo](https://github.com/bjoernwuest/LUYViewer/blob/main/LUYViewer_logo.png?raw=true)

Permits LUY users to download data and view it offline / without LUY.

The motivation of this application is the increasing effort of the LUY company to offer their product LUY as cloud-only SaaS solution. While comfortable and convenient (in my opinion), you are out of control of your data within LUY to some extent. Especially since LUY is often used to document process and IT landscapes, and thus likely used in Business Continuity Management, Emergency Response Teams, etc.. My background as consultant for iteratec GmbH, the initial developer of LUY (formerly iteraplan) from 2011 to 2016/2019, gives me the necessary background in understanding how LUY is used, as well as what is required in an emergency case where LUY is unavailable - for a couple of hours or a few days.  

This project has been entirely created using Artificial Intelligence (particularly Claude Sonnet 4). So, a big appreciation to Anthropic for their decent AI that made this small, nice application possible. Testing was done manually by me, I am still looking for a good AI doing this...

The LUYViewer is written in TypeScript, executed in Deno runtime, JavaScript, HTML, and CSS. For convenience, there are release packages for different platforms so the LUYViewer can be run without the Deno runtime - because it is bundled into the executable of the LUYViewer.

## Installation

1) Go to the [releases](https://github.com/bjoernwuest/LUYViewer/releases) and download the package appropriate for your environment.
2) Unpack the downloaded package.
3) Edit "config.json" file, particularly give other port number (default: 8080) and the URL to your "luy_host".
4) Run the LUYViewer application (on Windows, this is LUYViewer.exe)
5) Open the browser, usually the address is "http://localhost:<your port number configured in step #3>'

## Uninstallation

Delete the unpacked package.

## Usage

...To be written


## Team and roles

| Member                                                              | Role      |
|---------------------------------------------------------------------|-----------|
| Anthropic's Claude Sonnet 4 | Developer |
| [Bjoern Wuest (bjoern@liwuest.net)](https://github.com/bjoernwuest) | Committer |
| [Bjoern Wuest (bjoern@liwuest.net)](https://github.com/bjoernwuest) | Reviewer  |
| [Bjoern Wuest (bjoern@liwuest.net)](https://github.com/bjoernwuest) | Approver  |
| [Bjoern Wuest (bjoern@liwuest.net)](https://github.com/bjoernwuest) | Tester    |


## Privacy, data security, and code signing policy

This program will not transfer any information to other networked systems unless specifically requested by the user or the person installing or operating it.

Data remains local with the LUYViewer, whereever it is run. The LUYViewer is just a reader, it does not modify any data in your LUY instance. All data stored with the LUYViewer, i.e. downloaded snapshots of your data in LUY, is **NOT** encrypted. It is up to you to keep your data with the required level of security and privacy.

For the Windows package, a free code signing is provided by SignPath.io, certificate by SignPath Foundation. Thank you to make this service available to the open source community.


## License

The LUYViewer is licensed under the [Apache2 license](LICENSE).

## ToDo

* Write the "Usage" section
* Write Github workflows for automatic building and releasing
* Include SignPath to sign the Windows executable
* Make LUYViewer multilanguage capable
* In building block type overview table as well building block detail view, use "name" from metamodel document instead of key-name from data document
