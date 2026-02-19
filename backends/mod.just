mod fastapi

# Common variable used for running `just` commands from this file, but not from the repo root
# See: https://gist.github.com/GriceTurrble/1f08c363dc024e24d3ae102208113ccf
just_local := "just --justfile " + source_file()

# Sync each backend
sync:
    {{just_local}} fastapi sync

# Lint backends
lint:
    {{just_local}} fastapi lint
