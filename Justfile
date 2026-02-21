# backend modules
[group("submodules")]
mod backends

# backend modules
[group("submodules")]
mod frontends

### START COMMON ###
import? 'common.just'

# Show these help docs
[default]
@help:
    echo "{{GREEN}}[MLAD] Multi-Lang App Demo root{{NORMAL}}"
    echo "{{GREEN}}>> $(pwd){{NORMAL}}"
    echo ""
    just --list --unsorted --justfile {{ source_file() }}

# Pull latest common justfile recipes to local repo
[group("commons")]
sync-commons:
    -rm common.just
    curl -H 'Cache-Control: no-cache, no-store' \
        https://raw.githubusercontent.com/griceturrble/common-project-files/main/common.just?cachebust={{ uuid() }} > common.just
### END COMMON ###

# bootstrap the dev environment
bootstrap:
    just sync-commons
    just bootstrap-commons
    just sync

# Sync all dependencies in all projects
sync:
    just backends sync
    just frontends sync

# bring up Tilt to start all services
up:
    tilt up

# destroy Tilt resources so they will rebuild when using `just up` next time
down:
    tilt down
