# replit.nix — system packages Replit installs automatically
# Node.js and npm are provided by Replit's built-in Node template.
# We add sqlite (the CLI tool) so you can inspect dev.db directly if needed.

{ pkgs }: {
  deps = [
    pkgs.nodejs_20
    pkgs.nodePackages.typescript
    pkgs.sqlite          # lets you run `sqlite3 backend/prisma/dev.db` in the shell
    pkgs.openssl         # required by Prisma on Linux
  ];
}
