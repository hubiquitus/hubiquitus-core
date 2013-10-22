# Ip Resolution

Hubiquitus connects containers through peer to peer connections. In order to do it, it needs to resolve an internal ip available for local and remotes actors.
Ip resolution algorithm goes through all interfaces and pick the first one with an ip v4 using the following priorities :
* eth[0, 1, 2....]
* en[0, 1, 2....]
* wlan[0, 1, 2....]
* vmnet[0, 1, 2....]
* pp[0, 1, 2....]
* lo[0, 1, 2....]
