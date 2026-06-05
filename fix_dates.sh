# Fix in AlunoPerfil.tsx
sed -i '' 's/new Date(a.data + .T23:59:59.)/new Date(a.data + "T23:59:59Z")/g' src/pages/AlunoPerfil.tsx
sed -i '' 's/new Date(a.data + .T12:00:00.)/new Date(a.data + "T12:00:00Z")/g' src/pages/AlunoPerfil.tsx
sed -i '' 's/new Date((a.data || .2099-12-31.) + .T12:00:00.)/new Date((a.data || "2099-12-31") + "T12:00:00Z")/g' src/pages/AlunoPerfil.tsx
sed -i '' 's/new Date((b.data || .2099-12-31.) + .T12:00:00.)/new Date((b.data || "2099-12-31") + "T12:00:00Z")/g' src/pages/AlunoPerfil.tsx

# Fix in AreaAluno.tsx
sed -i '' 's/new Date(`${b.data}T${b.horario}`)/new Date(`${b.data}T${b.horario}Z`)/g' src/pages/AreaAluno.tsx
sed -i '' 's/new Date(`${a.data}T${a.horario}`)/new Date(`${a.data}T${a.horario}Z`)/g' src/pages/AreaAluno.tsx
sed -i '' 's/new Date(`${a.data}T${a.horario || .00:00:00.}`)/new Date(`${a.data}T${a.horario || "00:00:00"}Z`)/g' src/pages/AreaAluno.tsx
