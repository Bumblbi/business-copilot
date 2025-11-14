# Business-Copilot
## Зависимости
  node.js yarn
  python 3.13
  интернет, для работы нейросети

## Для запуска сборки
  необходимо использовать docker:
1. в командной строке перейдите в папку проекта:
   
   ```
   cd business_copilot
   ```
   
3. запустите docker-compose с созданием билда:

   ```
   docker-compose up --build
   ```
   
## Иные способы запуска:
1. откройте две командные строки, в первой введите:

    ```
    cd backend
    python backend.py
    ```
2. Во второй командной строке введите:

   ```
   cd frontend
   yarn dev
   ```
