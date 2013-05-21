desc 'Run jasmine unit tests'
task 'jasmine-spec' do
	sh 'jasmine-node --coffee spec'
end

desc 'Run go server unit tests'
task 'go-spec' do
	sh 'go test ./quinto'
end

desc 'Run go server integration tests'
task 'web-spec' do
  ENV['QUINTO_TEST'] = '1'
  ENV['PORT'] ||= '3001'
  ENV['PGUSER'] ||= 'postgres'
  ENV['PGDATABASE'] ||= 'quinto_test'
  ENV['PGHOST'] ||= 'localhost'
  ENV['DATABASE_CONFIG'] ||= "user=#{ENV['PGUSER']} dbname=#{ENV['PGDATABASE']} host=#{ENV['PGHOST']} sslmode=disable"
  rspec = ENV['RSPEC'] || 'rspec'

  sh "dropdb --if-exists #{ENV['PGDATABASE']}"
  sh "createdb #{ENV['PGDATABASE']}"
  sh "psql -f schema.sql #{ENV['PGDATABASE']}"
  pid = Process.spawn("#{ENV['GOPATH']}/bin/quinto")
  sleep 1
  begin
    sh "#{rspec} spec/integration_spec.rb"
  ensure 
     Process.kill(:SIGTERM, pid)
  end
end

desc 'Run all specs'
task 'default'=>%w'jasmine-spec go-spec web-spec'

desc 'Compile the coffeescript files to javascript'
task 'app.js' do
  sh 'cat client.coffee quinto.coffee | coffee -cs > public/app.js'
end
